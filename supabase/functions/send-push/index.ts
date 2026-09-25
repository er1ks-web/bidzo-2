// Bidzo push sender (Supabase Edge Function "send-push").
//
// Called by public.send_push_via_function() from the notification queue
// (supabase/push_notifications.sql) with { user_id, title, body, link }.
// Sends the notification to every phone registered for that user via
// Firebase Cloud Messaging (HTTP v1) and removes phones Firebase says are gone.
//
// Deploy with "Verify JWT" OFF: the caller is the database, which proves itself
// with the x-push-secret header instead.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   FCM_SERVICE_ACCOUNT  - the whole Firebase service-account JSON file
//   PUSH_WEBHOOK_SECRET  - same value as Vault secret 'push_webhook_secret'
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
const serviceAccount = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT') ?? '{}');
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Must match the channel the app creates (src/lib/push.js) and the small icon drawable.
const ANDROID_CHANNEL_ID = 'bidzo_default';
const ANDROID_ICON = 'ic_stat_bidzo';
const BRAND_COLOR = '#FACC15';

// FCM error codes meaning the token will never work again (app uninstalled, token rotated,
// or registered under another Firebase project). INVALID_ARGUMENT is deliberately not here:
// it can also mean a malformed message, and must not wipe every user's tokens.
const DEAD_TOKEN_ERRORS = new Set(['UNREGISTERED', 'SENDER_ID_MISMATCH']);

function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Google OAuth access token for FCM, from the service account (signed JWT, RS256).
// Cached across requests while this function instance is warm.
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' +
    base64url(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }));

  const pem = String(serviceAccount.private_key ?? '')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth failed: ${res.status} ${await res.text()}`);

  const json = await res.json();
  cachedAccessToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function sendToToken(accessToken: string, token: string, title: string, body: string, link: string) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          // Read by the app when the notification is tapped (opens this page).
          data: { link },
          android: {
            priority: 'HIGH',
            notification: { channel_id: ANDROID_CHANNEL_ID, icon: ANDROID_ICON, color: BRAND_COLOR },
          },
        },
      }),
    },
  );
  if (res.ok) return { ok: true as const };

  const err = await res.json().catch(() => ({}));
  const code: string =
    err?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode ?? err?.error?.status ?? '';
  return { ok: false as const, dead: DEAD_TOKEN_ERRORS.has(code), code, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET || req.headers.get('x-push-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { user_id, title, body, link } = await req.json().catch(() => ({}));
  if (!user_id) return new Response('user_id required', { status: 400 });

  const { data: rows, error } = await supabase.from('push_tokens').select('token').eq('user_id', user_id);
  if (error) return new Response(`push_tokens lookup failed: ${error.message}`, { status: 500 });
  if (!rows?.length) return Response.json({ sent: 0, removed: 0 });

  const accessToken = await getAccessToken();
  let sent = 0;
  const dead: string[] = [];
  const failures: unknown[] = [];

  for (const { token } of rows) {
    const result = await sendToToken(accessToken, token, title || 'Bidzo', body || '', link || '');
    if (result.ok) sent++;
    else if (result.dead) dead.push(token);
    else failures.push({ code: result.code, status: result.status });
  }

  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);
  if (failures.length) console.error('FCM failures', failures);

  return Response.json({ sent, removed: dead.length, failed: failures.length });
});
