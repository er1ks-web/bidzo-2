import { supabase } from '@/supabase'

// Server side: supabase/account_deletion.sql (48-hour grace period, then purge by pg_cron).

// Returns { ok: true, scheduled_for } or { ok: false, blockers: { active_listings, open_deals, leading_bids } }.
export async function requestAccountDeletion() {
  const { data, error } = await supabase.rpc('request_account_deletion')
  if (error) throw error
  return data
}

export async function cancelAccountDeletion() {
  const { error } = await supabase.rpc('cancel_account_deletion')
  if (error) throw error
}

// The pending deletion date for this user, or null.
export async function getPendingAccountDeletion(userId) {
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('scheduled_for')
    .eq('user_id', userId)
    .is('processed_at', null)
    .maybeSingle()
  if (error) throw error
  return data?.scheduled_for || null
}

const LOCALES = { lv: 'lv-LV', en: 'en-GB', ru: 'ru-RU' }

export function formatDeletionDate(iso, lang) {
  return new Date(iso).toLocaleString(LOCALES[lang] || undefined, { dateStyle: 'long', timeStyle: 'short' })
}
