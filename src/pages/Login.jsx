import { useState } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');

  const handlePasswordReset = async () => {
    if (loading) return
    if (!email) {
      toast.error(t('login_extra.enterEmailFirst'))
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })

    if (error) {
      console.log(error)
      toast.error(error.message || t('login_extra.passwordResetFailed'))
      setLoading(false)
      return
    }

    toast.success(t('login_extra.passwordResetSent'))
    setLoading(false)
  }

  const handleGoogle = async () => {
    if (loading) return
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    })

    if (error) {
      console.log(error)
      toast.error(error.message || t('login_extra.googleSigninFailed'))
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('[Auth] submit', { mode, hasEmail: !!email, hasPassword: !!password });
    if (!email || !password) return;

    setLoading(true);
    console.log('[Auth] requesting', { mode, email });
    const { data, error } = mode === 'signup'
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/auth/callback',
          },
        })
      : await supabase.auth.signInWithPassword({
          email,
          password,
        });

    console.log('[Auth] response', {
      mode,
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      error: error ? { message: error.message, status: error.status, code: error.code } : null,
    });

    if (error) {
      console.log(error);
      toast.error(error.message || (mode === 'signup' ? t('login_extra.signupFailed') : t('login_extra.loginFailed')));
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !data?.session) {
      toast.success(t('login_extra.accountCreatedVerify'));
      setLoading(false);
      return;
    }

    toast.success(mode === 'signup' ? t('login_extra.accountCreated') : t('login_extra.loggedIn'));
    setLoading(false);
    const to = location.state?.from || '/profile'
    console.log('[Auth] navigate', { to });
    navigate(to);
  };

  return (
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
    <div className="max-w-md mx-auto px-4 sm:px-6 py-10">
      <div className="bg-card border rounded-xl p-6">
        <h1 className="text-2xl font-display font-bold mb-1">{mode === 'signup' ? (t('profile.signup') || 'Sign up') : (t('profile.login') || 'Login')}</h1>
        <p className="text-sm text-muted-foreground mb-4">{mode === 'signup' ? (t('profile.signupSubtitle') || 'Create an account to continue') : (t('profile.loginSubtitle') || 'Sign in to continue')}</p>

        {mode === 'signup' && (
          <div className="text-xs text-muted-foreground mb-6">
            {t('profile.verifyEmailHint') || 'After signing up, you may need to verify your email before you can log in.'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button
            type="button"
            variant={mode === 'login' ? 'default' : 'outline'}
            onClick={() => setMode('login')}
            className={mode === 'login' ? 'bg-accent hover:bg-accent/90 text-accent-foreground font-semibold' : ''}
          >
            {t('profile.login') || 'Login'}
          </Button>
          <Button
            type="button"
            variant={mode === 'signup' ? 'default' : 'outline'}
            onClick={() => setMode('signup')}
            className={mode === 'signup' ? 'bg-accent hover:bg-accent/90 text-accent-foreground font-semibold' : ''}
          >
            {t('profile.signup') || 'Sign up'}
          </Button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogle}
            className="w-full gap-2"
          >
            <span>{t('login_extra.continueWith')}</span>
            <img
              src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
              alt="Google"
              className="h-5 w-auto"
              loading="lazy"
              draggable={false}
            />
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t('login_extra.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t('login_extra.password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {t('login_extra.forgotPassword')}
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {loading ? (t('common.loading') || 'Loading...') : (mode === 'signup' ? (t('profile.signup') || 'Sign up') : (t('profile.login') || 'Login'))}
          </Button>
        </form>
      </div>
    </div>
    </div>
  );
}
