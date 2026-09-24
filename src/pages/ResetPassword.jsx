import { useEffect, useState } from 'react'
import { supabase } from '@/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const tokenHash = params.get('token_hash')
        const code = params.get('code')

        // 1) Link from the Reset Password email template
        //    ({{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery).
        //    Works in any browser or device, unlike the PKCE ?code link below, which only
        //    works in the browser that requested the reset (not e.g. app -> Gmail -> Chrome).
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: params.get('type') || 'recovery' })
          if (error) console.log(error)
          window.history.replaceState({}, document.title, window.location.pathname)
        } else if (code) {
          // 2) PKCE link (same browser only). The client may already have exchanged it on load.
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) console.log(error)
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        // 3) Older implicit flow: tokens in the URL hash
        const hasAccessTokenHash = typeof window.location.hash === 'string' && window.location.hash.includes('access_token=')

        if (hasAccessTokenHash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) console.log(error)
          }

          // Remove hash (contains sensitive tokens)
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
        }

        // Ensure session exists
        const { data } = await supabase.auth.getSession()
        if (!data?.session) {
          toast.error('Reset link is invalid or expired. Please request a new one.')
          if (!cancelled) navigate('/login')
          return
        }

        if (!cancelled) setChecking(false)
      } catch (e) {
        console.log(e)
        toast.error('Reset link is invalid or expired. Please request a new one.')
        if (!cancelled) navigate('/login')
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      console.log(error)
      toast.error(error.message || 'Failed to update password')
      setLoading(false)
      return
    }

    // The reset link already signed the user in, so continue straight into the account.
    toast.success('Password updated')
    setLoading(false)
    navigate('/profile')
  }

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-medium">Checking reset link...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
    <div className="max-w-md mx-auto px-4 sm:px-6 py-10">
      <div className="bg-card border rounded-xl p-6">
        <h1 className="text-2xl font-display font-bold mb-1">Reset password</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter a new password for your account.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {loading ? 'Saving...' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
    </div>
  )
}
