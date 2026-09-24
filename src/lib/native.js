import { Capacitor, registerPlugin } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { StatusBar, Style } from '@capacitor/status-bar'

export const isNativeApp = Capacitor.isNativePlatform()

// The public website. Inside the app the page origin is https://localhost, so
// anything meant for other people or for email (share links, auth emails) must
// point here instead.
export const SITE_URL = 'https://www.bidzo.lv'

// Where Google/Supabase send the user back to after signing in inside the app.
// Must be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs,
// and matches the intent-filter in android/app/src/main/AndroidManifest.xml.
export const NATIVE_AUTH_REDIRECT = 'com.bidzo.app://auth/callback'

// Absolute URL for a path on the site: the current origin on the web, the public site in the app.
export function siteUrl(path) {
  return (isNativeApp ? SITE_URL : window.location.origin) + path
}

// Shareable URL of the page the user is on.
export function currentPageUrl() {
  if (!isNativeApp) return window.location.href
  return SITE_URL + window.location.pathname + window.location.search
}

// Opens an OAuth sign-in page in an in-app browser tab (Google blocks sign-in inside web views).
export function openAuthBrowser(url) {
  return Browser.open({ url })
}

// Fires when the user closes the sign-in tab without finishing. Returns an unsubscribe function.
export function onAuthBrowserClosed(callback) {
  if (!isNativeApp) return () => {}
  const handle = Browser.addListener('browserFinished', callback)
  return () => handle.then((h) => h.remove())
}

// Match the phone's status bar to the app theme (light: white bar, dark icons).
export function setStatusBarTheme(effectiveTheme) {
  if (!isNativeApp) return
  const light = effectiveTheme === 'light'
  StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: light ? '#ffffff' : '#111111' }).catch(() => {})
}

// android/app/src/main/java/com/bidzo/app/LaunchScreenPlugin.java
const LaunchScreen = registerPlugin('LaunchScreen')

let splashHidden = false

// The launch screen stays up until the app has something to show, then plays
// its exit animation (MainActivity.java) into the first page.
export function hideSplash() {
  if (!isNativeApp || splashHidden) return
  splashHidden = true
  LaunchScreen.hide().catch(() => {})
}

// Wires up behaviour that only exists inside the Android/iOS app shell.
// No-op on the website.
export function initNativeApp() {
  if (!isNativeApp) return

  // Android hardware back button: go back in history, or exit on the first screen.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else App.exitApp()
  })

  // Returning from Google sign-in: hand the ?code=... to the normal /auth/callback page,
  // which exchanges it for a session exactly like on the website.
  App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return
    Browser.close().catch(() => {})
    const { search, hash } = new URL(url)
    window.location.replace('/auth/callback' + search + hash)
  })
}
