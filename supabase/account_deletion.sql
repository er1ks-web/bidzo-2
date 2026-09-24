-- =============================================================================
-- Bidzo: account deletion with a 48-hour grace period
--
-- Run this whole file once in Supabase -> SQL Editor. It is safe to run again.
--
-- Flow:
--   1. The user taps "Delete account" (Settings). The app calls
--      request_account_deletion(), which refuses while they still have active
--      listings, unfinished deals or auctions they are currently winning.
--   2. The request is stored with scheduled_for = now + 48h and the user is
--      logged out. If they log back in before then, the app shows a screen with
--      "Cancel deletion" (cancel_account_deletion()).
--   3. A pg_cron job runs process_account_deletions() every 15 minutes. For due
--      requests, purge_account() erases personal data, removes the Google link
--      and sessions, and permanently blocks the login. Reviews, messages, bids and
--      completed deals stay for the other people involved, shown under an
--      anonymous "deleted_..." username.
--
-- Anything that fails during a purge is written to
-- account_deletion_requests.last_error instead of being silently skipped:
--   select * from public.account_deletion_requests where last_error is not null;
-- =============================================================================

create extension if not exists pg_cron;

create table if not exists public.account_deletion_requests (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null,
  processed_at  timestamptz,
  last_error    text
);

alter table public.account_deletion_requests enable row level security;

-- Users can see their own pending request (the app reads it to show the
-- "scheduled for deletion" screen). All writes go through the functions below.
drop policy if exists "Users can read their own deletion request" on public.account_deletion_requests;
create policy "Users can read their own deletion request"
  on public.account_deletion_requests
  for select
  to authenticated
  using (user_id = auth.uid());


-- What still has to be finished before an account can be deleted.
create or replace function public.account_deletion_blockers(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active_listings', (
      select count(*)
      from listings l
      where l.seller_id = p_user
        and l.status = 'active'
        and coalesce(l.is_deleted, false) = false
        and coalesce(l.is_sold, false) = false
        and (l.listing_type <> 'auction' or l.auction_end is null or l.auction_end > now())
    ),
    'open_deals', (
      select count(*)
      from auction_transactions t
      where (t.buyer_id = p_user or t.seller_id = p_user)
        and coalesce(t.status, '') not in ('completed', 'cancelled', 'canceled')
    ),
    'leading_bids', (
      select count(*)
      from listings l
      where l.listing_type = 'auction'
        and l.status = 'active'
        and coalesce(l.is_deleted, false) = false
        and coalesce(l.is_sold, false) = false
        and l.auction_end > now()
        and (
          select b.bidder_id
          from bids b
          where b.listing_id = l.id
          order by b.amount desc, b.created_at asc
          limit 1
        ) = p_user
    )
  );
$$;


-- Called by the app. Returns {ok: true, scheduled_for} or {ok: false, blockers}.
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_blockers jsonb;
  v_when timestamptz;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Already pending: keep the original date rather than restarting the 48 hours.
  select scheduled_for into v_when
  from account_deletion_requests
  where user_id = v_user and processed_at is null;
  if v_when is not null then
    return jsonb_build_object('ok', true, 'scheduled_for', v_when);
  end if;

  v_blockers := account_deletion_blockers(v_user);
  if (v_blockers ->> 'active_listings')::int > 0
     or (v_blockers ->> 'open_deals')::int > 0
     or (v_blockers ->> 'leading_bids')::int > 0 then
    return jsonb_build_object('ok', false, 'blockers', v_blockers);
  end if;

  insert into account_deletion_requests (user_id, scheduled_for)
  values (v_user, now() + interval '48 hours')
  on conflict (user_id) do update
    set requested_at  = now(),
        scheduled_for = excluded.scheduled_for,
        processed_at  = null,
        last_error    = null
  returning scheduled_for into v_when;

  return jsonb_build_object('ok', true, 'scheduled_for', v_when);
end;
$$;


-- Called by the app from the "scheduled for deletion" screen.
create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from account_deletion_requests
  where user_id = auth.uid() and processed_at is null;
end;
$$;


-- Erases one account. Each step is isolated so one unexpected table/column
-- problem doesn't stop the rest; failures are returned and stored in last_error.
create or replace function public.purge_account(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
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
$$;


-- Run by pg_cron: purges every request whose 48 hours are up.
create or replace function public.process_account_deletions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select user_id
    from account_deletion_requests
    where processed_at is null and scheduled_for <= now()
  loop
    update account_deletion_requests
    set processed_at = now(),
        last_error = public.purge_account(r.user_id)
    where user_id = r.user_id;
  end loop;
end;
$$;


-- Permissions. Supabase lets anon/authenticated call new public functions by
-- default; the purge functions must NOT be callable from the app.
revoke all on function public.account_deletion_blockers(uuid) from public, anon, authenticated;
revoke all on function public.purge_account(uuid) from public, anon, authenticated;
revoke all on function public.process_account_deletions() from public, anon, authenticated;

revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;


-- Schedule the purge every 15 minutes (replaces the job if it already exists).
select cron.unschedule(jobid) from cron.job where jobname = 'bidzo-process-account-deletions';
select cron.schedule(
  'bidzo-process-account-deletions',
  '*/15 * * * *',
  $$select public.process_account_deletions()$$
);
