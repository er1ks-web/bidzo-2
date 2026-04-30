import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/supabase'

export default function AuthCallback() {
  const location = useLocation()

  useEffect(() => {
    let cancelled = false

    const go = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const hasOAuthCode = !!params.get('code')
        const hasAccessTokenHash = typeof window.location.hash === 'string' && window.location.hash.includes('access_token=')

        // 1) Implicit flow (tokens in URL hash)
        if (hasAccessTokenHash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token })
            if (setSessionError) console.log(setSessionError)
          }

          // Remove hash (contains sensitive tokens)
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
        }

        // 2) PKCE code flow (?code=...)
        if (hasOAuthCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (exchangeError) console.log(exchangeError)

          params.delete('code')
          params.delete('state')
          params.delete('error')
          params.delete('error_code')
          params.delete('error_description')
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
          window.history.replaceState({}, document.title, next)
        }
      } catch (e) {
        console.log(e)
      }

      // 3) Ensure we have a session
      let session = null
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.auth.getSession()
        if (error) console.log(error)
        session = data?.session || null
        if (session) break
        await new Promise(r => setTimeout(r, 150))
      }

      if (!session) {
        if (!cancelled) window.location.replace('/login')
        return
      }

      // 4) Create profile on first login/signup (Google or email)
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) console.log(error)

        const u = data?.user
        if (u?.id && u?.email) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .limit(1)

          if (profileError) console.log(profileError)

          const profile = Array.isArray(profileData) ? (profileData[0] || null) : null
          if (!profile) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: u.id,
                email: u.email,
                full_name: u.user_metadata?.full_name || u.email,
                profile_picture_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || '',
              })

            if (insertError) console.log(insertError)
          }
        }
      } catch (e) {
        console.log(e)
      }

      if (!cancelled) {
        window.location.replace('/profile')
      }
    }

    go().catch((e) => {
      console.log(e)
      window.location.replace('/login')
    })

    return () => {
      cancelled = true
    }
  }, [location.key])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin"></div>
        <span className="text-sm text-muted-foreground font-medium">Signing you in...</span>
      </div>
    </div>
  )
}
