import { PushNotifications } from '@capacitor/push-notifications'
import { toast } from 'sonner'
import { supabase } from '@/supabase'
import { isNativeApp } from '@/lib/native'

// Push notifications in the Android app. The server side (queue -> Edge Function
// send-push -> Firebase) is in supabase/push_notifications.sql and
// supabase/functions/send-push. Requires android/app/google-services.json.

// Must match ANDROID_CHANNEL_ID in supabase/functions/send-push/index.ts.
const CHANNEL_ID = 'bidzo_default'

let listenersReady = false
// In-app banner (InAppNotificationBanner) for pushes that arrive while the app is open.
const foregroundListeners = new Set()
let currentToken = null
let navigateTo = null
let pendingLink = null

function openLink(link) {
  if (!link) return
  if (navigateTo) navigateTo(link)
  else pendingLink = link // tapped before the app finished starting
}

async function addListeners() {
  if (listenersReady) return
  listenersReady = true

  // Android 8+: notifications need a channel; "high" importance shows them as banners.
  await PushNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Bidzo',
    description: 'Pārsolīšana, ziņas, izsoles un darījumi',
    importance: 4,
    visibility: 1,
    vibration: true,
  }).catch(() => {})

  PushNotifications.addListener('registration', ({ value }) => {
    currentToken = value
    supabase
      .rpc('register_push_token', { p_token: value, p_platform: 'android' })
      .then(({ error }) => { if (error) console.log(error) })
  })

  PushNotifications.addListener('registrationError', (e) => console.log('Push registration failed', e))

  // Android doesn't show a system notification while the app is open, so show our own
  // banner (or a toast if the banner isn't mounted).
  PushNotifications.addListener('pushNotificationReceived', (n) => {
    const notification = { title: n.title, body: n.body, link: n.data?.link || '' }
    if (foregroundListeners.size) {
      foregroundListeners.forEach((listener) => listener(notification))
      return
    }
    toast(notification.title || 'Bidzo', {
      description: notification.body,
      action: notification.link ? { label: '→', onClick: () => openLink(notification.link) } : undefined,
    })
  })

  // Tapping a notification opens the page it is about (listing, chat, deal).
  PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    openLink(notification?.data?.link)
  })
}

// Subscribe to pushes received while the app is open. Returns an unsubscribe function.
export function onForegroundPush(listener) {
  foregroundListeners.add(listener)
  return () => foregroundListeners.delete(listener)
}

// Router navigate function, set once the app's layout has mounted.
export function setPushNavigator(navigate) {
  navigateTo = navigate
  if (navigate && pendingLink) {
    const link = pendingLink
    pendingLink = null
    navigate(link)
  }
}

// Call when a user is logged in inside the app: asks permission once, then
// (re)registers this phone for the user. Safe to call on every app start.
export async function startPush() {
  if (!isNativeApp) return
  try {
    await addListeners()
    let permission = await PushNotifications.checkPermissions()
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions()
    }
    if (permission.receive !== 'granted') return
    await PushNotifications.register()
  } catch (e) {
    console.log('Push setup failed', e)
  }
}

// Call before signing out, while the session still exists, so this phone stops
// receiving the user's notifications.
export async function stopPush() {
  if (!isNativeApp || !currentToken) return
  const token = currentToken
  currentToken = null
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token })
  if (error) console.log(error)
}

// Whether the phone allows Bidzo notifications (for the hint in Settings).
export async function getPushPermission() {
  if (!isNativeApp) return 'unsupported'
  try {
    return (await PushNotifications.checkPermissions()).receive
  } catch {
    return 'unsupported'
  }
}

export async function requestPushPermission() {
  if (!isNativeApp) return 'unsupported'
  const { receive } = await PushNotifications.requestPermissions()
  if (receive === 'granted') await PushNotifications.register()
  return receive
}
