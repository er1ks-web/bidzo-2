// "Online" is a soft heuristic, not a live socket connection: AuthContext
// touches profiles.last_seen_at every ~60s while the tab is visible, so a
// timestamp within the last couple of minutes means "was just here".
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs >= 0 && diffMs < ONLINE_THRESHOLD_MS;
}

// Mirrors the isOnline() cutoff so the text and the dot never disagree.
export function formatLastSeen(lastSeenAt, t) {
  if (!lastSeenAt) return null;

  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (diffMs < ONLINE_THRESHOLD_MS) return t('presence.onlineNow');

  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return t('presence.lastSeenMinutes').replace('{n}', mins);

  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('presence.lastSeenHours').replace('{n}', hours);

  const days = Math.floor(hours / 24);
  return t('presence.lastSeenDays').replace('{n}', days);
}
