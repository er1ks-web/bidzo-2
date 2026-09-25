-- =============================================================================
-- Bidzo: push notifications (Android app) next to the existing email notifications
--
-- Run this whole file once in Supabase -> SQL Editor. It is safe to run again.
--
-- How it fits the existing setup:
--   notification_events (queue)  --every 30s-->  process_pending_notifications()
--        |                                            |-- email via Resend (as before)
--        |                                            '-- push via Edge Function send-push -> Firebase
--   Per-type switches (outbid, new_message, ...) still decide WHICH notifications a user gets;
--   the new master switches email_enabled / push_enabled decide on WHICH CHANNEL.
--
-- Defaults: signed up in the app -> email off, push on. Signed up on the website -> both on.
-- Existing users keep email on.
--
-- Before running, the Edge Function send-push must be deployed (supabase/functions/send-push).
-- After running, copy the generated webhook secret into the function's secrets (see the
-- instructions at the bottom of this file).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Channel switches on notification_prefs
-- ---------------------------------------------------------------------------
alter table public.notification_prefs add column if not exists email_enabled boolean not null default true;
alter table public.notification_prefs add column if not exists push_enabled boolean not null default true;
-- 'app' or 'web'; set once for new accounts so the app-signup default is only ever applied once.
alter table public.notification_prefs add column if not exists signup_source text;


-- New profiles: email off when the account was created in the app. Email/password sign-ups
-- from the app pass signup_source = 'app' in the auth metadata (src/pages/Login.jsx).
create or replace function public.handle_new_user_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source text;
begin
  select raw_user_meta_data ->> 'signup_source' into v_source from auth.users where id = new.id;

  insert into public.notification_prefs (user_id, email_enabled, signup_source)
  values (new.id, coalesce(v_source, 'web') <> 'app', coalesce(v_source, 'web'))
  on conflict (user_id) do nothing;
  return new;
end;
$function$;


-- Called by the app right after login. Google sign-ups can't carry metadata, so an account
-- created in the last 15 minutes that logs in from the app for the first time counts as an
-- app sign-up. Existing accounts (older, or already stamped) are never changed.
create or replace function public.apply_app_signup_defaults()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return; end if;

  update public.notification_prefs np
  set email_enabled = false,
      signup_source = 'app'
  from auth.users u
  where np.user_id = v_user
    and u.id = v_user
    and u.created_at > now() - interval '15 minutes'
    and (np.signup_source is null or np.signup_source = 'web')
    and coalesce(u.raw_user_meta_data ->> 'signup_source', '') <> 'web';
end;
$function$;


-- ---------------------------------------------------------------------------
-- 2. Device tokens
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  platform    text not null default 'android',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
-- No direct access from the app; everything goes through the two functions below.
drop policy if exists "Users can read their own push tokens" on public.push_tokens;
create policy "Users can read their own push tokens"
  on public.push_tokens for select to authenticated
  using (user_id = auth.uid());

-- Saves this phone for the logged-in user. If the phone was registered to another account
-- (log out, log in as someone else) it moves to the new one.
create or replace function public.register_push_token(p_token text, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), coalesce(p_platform, 'android'))
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$function$;

-- Called on logout so a shared phone stops getting the previous user's notifications.
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
end;
$function$;


-- ---------------------------------------------------------------------------
-- 3. Sending: Edge Function URL + shared secret in Vault
-- ---------------------------------------------------------------------------
-- The URL is derived from this project's own API URL; the secret is random.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_function_url') then
    perform vault.create_secret(
      'https://xnadmnketxbquyrgqmcs.supabase.co/functions/v1/send-push',
      'push_function_url'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'push_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_webhook_secret');
  end if;
end $$;

-- Hands one notification to the send-push Edge Function (fire-and-forget, like the emails).
create or replace function public.send_push_via_function(p_user_id uuid, p_title text, p_body text, p_link text)
returns bigint
language plpgsql
security definer
set search_path to 'public, extensions'
as $function$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    raise exception 'Push function URL/secret not configured in Vault';
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'link', p_link)
  ) into v_request_id;

  return v_request_id;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 4. Queue processor: unchanged email logic, now gated by email_enabled, plus push
-- ---------------------------------------------------------------------------
create or replace function public.process_pending_notifications()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_email text;
  v_html text;
  v_subject text;
  v_body text;
  v_button_html text;
  v_email_on boolean;
  v_push_on boolean;
begin
  for r in
    select *
    from public.notification_events
    where sent_at is null and ready_at <= now()
    order by ready_at asc
    limit 200
  loop
    -- re-check prefs in case they were toggled off after enqueueing
    if not public.notification_pref_allows(r.user_id, r.event_type) then
      update public.notification_events set sent_at = now() where id = r.id;
      continue;
    end if;

    select coalesce(np.email_enabled, true), coalesce(np.push_enabled, true)
      into v_email_on, v_push_on
    from public.notification_prefs np
    where np.user_id = r.user_id;
    v_email_on := coalesce(v_email_on, true);
    v_push_on := coalesce(v_push_on, true);

    -- Push: only users who have the app (a registered phone) and push switched on.
    -- A push failure must never block the email or leave the event stuck in the queue.
    if v_push_on and exists (select 1 from public.push_tokens pt where pt.user_id = r.user_id) then
      begin
        perform public.send_push_via_function(r.user_id, r.subject, r.body_text, r.link_path);
      exception when others then
        raise warning 'push for notification % failed: %', r.id, sqlerrm;
      end;
    end if;

    select email into v_email from public.profiles where id = r.user_id;

    if v_email_on and v_email is not null then
      -- subject/body_text often embed user-controlled text (listing titles,
      -- usernames) -- escape before it goes into HTML so a listing title
      -- like `<img src=x onerror=...>` can't inject into every recipient's
      -- email.
      v_subject := replace(replace(replace(replace(replace(
        coalesce(r.subject, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
      v_body := replace(replace(replace(replace(replace(
        coalesce(r.body_text, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');

      if r.link_path is not null then
        v_button_html := $html$<tr>
        <td style="padding:0 32px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-radius:8px;background-color:#facc14;">
                <a href="https://bidzo.lv$html$ || r.link_path || $html$" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#0d0d0d;text-decoration:none;border-radius:8px;">View on Bidzo &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>$html$;
      else
        v_button_html := '';
      end if;

      v_html := $html$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Bidzo</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;">
        <tr>
          <td align="center" style="padding:32px 32px 20px;">
            <img src="https://xnadmnketxbquyrgqmcs.supabase.co/storage/v1/object/public/site-assets/bidzo-web-logo-new.png" alt="Bidzo" width="110" style="display:block;height:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;">
            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.35;color:#ffffff;font-weight:700;">$html$ || v_subject || $html$</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 28px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#c4c4c4;">$html$ || v_body || $html$</p>
          </td>
        </tr>
        $html$ || v_button_html || $html$
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7a7a7a;">
              You're receiving this because of your Bidzo notification settings.
              <a href="https://bidzo.lv/settings" style="color:#facc14;text-decoration:underline;">Manage preferences</a>
            </p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding:18px 8px 0;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#555555;">Bidzo &mdash; Latvijas izsoles platforma</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>$html$;

      perform public.send_email_via_resend(v_email, r.subject, v_html);
    end if;

    update public.notification_events set sent_at = now() where id = r.id;
  end loop;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 5. Account deletion also forgets the user's phones
-- ---------------------------------------------------------------------------
create or replace function public.purge_account(p_user uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_errors text := '';
begin
  -- Personal-only data.
  begin delete from favorites where user_id = p_user;
  exception when others then v_errors := v_errors || 'favorites: ' || sqlerrm || E'\n'; end;

  begin delete from notification_prefs where user_id = p_user;
  exception when others then v_errors := v_errors || 'notification_prefs: ' || sqlerrm || E'\n'; end;

  begin delete from auto_bids where user_id = p_user;
  exception when others then v_errors := v_errors || 'auto_bids: ' || sqlerrm || E'\n'; end;

  begin delete from push_tokens where user_id = p_user;
  exception when others then v_errors := v_errors || 'push_tokens: ' || sqlerrm || E'\n'; end;

  -- Profile: keep the row (reviews, messages and deals point at it) but remove
  -- everything that identifies the person.
  begin
    update profiles
    set username = 'deleted_' || substr(replace(p_user::text, '-', ''), 1, 10),
        phone_number = null,
        city = null,
        bio = null,
        profile_picture_url = ''
    where id = p_user;
  exception when others then v_errors := v_errors || 'profiles: ' || sqlerrm || E'\n'; end;

  begin update profiles set email = null where id = p_user;
  exception when others then
    begin update profiles set email = 'deleted-' || p_user || '@deleted.invalid' where id = p_user;
    exception when others then v_errors := v_errors || 'profiles.email: ' || sqlerrm || E'\n'; end;
  end;

  -- Login: unlink Google, end every session, scrub the auth record and block it for good.
  -- The email is freed, so the person can sign up again later as a new user.
  begin
    delete from auth.identities where user_id = p_user;
    delete from auth.sessions where user_id = p_user;
    update auth.users
    set email = 'deleted-' || p_user || '@deleted.invalid',
        phone = null,
        encrypted_password = null,
        raw_user_meta_data = '{}'::jsonb,
        banned_until = 'infinity'
    where id = p_user;
  exception when others then v_errors := v_errors || 'auth: ' || sqlerrm || E'\n'; end;

  begin delete from auth.refresh_tokens where user_id = p_user::text;
  exception when others then v_errors := v_errors || 'auth.refresh_tokens: ' || sqlerrm || E'\n'; end;

  return nullif(v_errors, '');
end;
$function$;


-- ---------------------------------------------------------------------------
-- 6. Permissions: the app may only call register/unregister/apply_app_signup_defaults
-- ---------------------------------------------------------------------------
revoke all on function public.send_push_via_function(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.process_pending_notifications() from public, anon, authenticated;
revoke all on function public.purge_account(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user_notification_prefs() from public, anon, authenticated;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
revoke all on function public.apply_app_signup_defaults() from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.apply_app_signup_defaults() to authenticated;


-- ---------------------------------------------------------------------------
-- After running: copy the webhook secret into the Edge Function's secrets.
-- Run this on its own, copy the value, and add it in Supabase -> Edge Functions -> Secrets
-- as PUSH_WEBHOOK_SECRET:
--
--   select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
-- ---------------------------------------------------------------------------
