-- =============================================================================
-- Bidzo: instant push notifications
--
-- Run once in Supabase -> SQL Editor, after supabase/push_notifications.sql. Safe to run again.
--
-- Before: push went out with the email, from the queue job that runs every 30 seconds and
-- after each notification's debounce delay (p_delay) -- up to a minute for chat messages.
-- Now:    enqueue_notification() sends the push immediately (1-2 s, every message gets its
--         own push, like a chat app). Email keeps its delay/debounce and the 30 s job.
--         notification_events.push_sent_at stops the job from sending the push twice; if
--         the instant push failed, the job sends it as a backup.
-- =============================================================================

alter table public.notification_events add column if not exists push_sent_at timestamptz;


create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_event_type text,
  p_dedupe_key text,
  p_delay interval,
  p_subject text,
  p_body_text text,
  p_link_path text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id bigint;
  v_push_on boolean;
begin
  if p_user_id is null then
    return;
  end if;

  if not public.notification_pref_allows(p_user_id, p_event_type) then
    return;
  end if;

  insert into public.notification_events (user_id, event_type, dedupe_key, ready_at, subject, body_text, link_path)
  values (p_user_id, p_event_type, p_dedupe_key, now() + p_delay, p_subject, p_body_text, p_link_path)
  on conflict (dedupe_key) where sent_at is null
  do update set
    ready_at = excluded.ready_at,
    subject = excluded.subject,
    body_text = excluded.body_text,
    link_path = excluded.link_path
  returning id into v_event_id;

  -- Instant push. net.http_post is queued and only sent once the surrounding transaction
  -- (the message/bid being saved) commits, so this adds no noticeable time to it.
  select np.push_enabled into v_push_on from public.notification_prefs np where np.user_id = p_user_id;
  if coalesce(v_push_on, true)
     and exists (select 1 from public.push_tokens pt where pt.user_id = p_user_id) then
    begin
      perform public.send_push_via_function(p_user_id, p_subject, p_body_text, p_link_path);
      update public.notification_events set push_sent_at = now() where id = v_event_id;
    exception when others then
      -- Leave push_sent_at empty: process_pending_notifications() will retry it.
      raise warning 'instant push for notification % failed: %', v_event_id, sqlerrm;
    end;
  end if;
end;
$function$;


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

    -- Push normally goes out instantly from enqueue_notification(); this is only the
    -- backup for pushes that weren't sent then (failed, or the phone registered later).
    -- A push failure must never block the email or leave the event stuck in the queue.
    if r.push_sent_at is null and v_push_on
       and exists (select 1 from public.push_tokens pt where pt.user_id = r.user_id) then
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


revoke all on function public.process_pending_notifications() from public, anon, authenticated;
