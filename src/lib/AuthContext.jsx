import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/supabase'
import { appParams } from '@/lib/app-params';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      setIsAuthenticated(!!currentUser)
      setIsLoadingAuth(false)
    })

    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const headers = {
          'X-App-Id': appParams.appId,
        };

        if (appParams.token) {
          headers['Authorization'] = `Bearer ${appParams.token}`;
        }

        const res = await fetch(`/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, { headers });

        if (!res.ok) {
          throw new Error(`Public settings fetch failed: ${res.status}`);
        }

        const publicSettings = await res.json();
        setAppPublicSettings(publicSettings);

        await checkUserAuth();
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        // Allow public access even if app check fails — don't block browsing
        setIsLoadingPublicSettings(false);
        await checkUserAuth();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setIsLoadingPublicSettings(false);
      await checkUserAuth();
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);

      // If we just returned from an OAuth provider (Google), exchange the code for a session.
      // Without this, the app can redirect successfully but still appear logged out.
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const hasOAuthCode = !!params.get('code')
          if (hasOAuthCode) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
            if (exchangeError) console.log(exchangeError)

            // Clean the URL (remove code param) to avoid re-processing on refresh
            params.delete('code')
            params.delete('state')
            params.delete('error')
            params.delete('error_code')
            params.delete('error_description')
            const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`
            window.history.replaceState({}, document.title, next)
          }
        }
      } catch (e) {
        console.log(e)
      }

      const { data, error } = await supabase.auth.getUser();
      if (error) console.log(error)

      const currentUser = data?.user || null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    supabase.auth.signOut().then(({ error }) => {
      if (error) console.log(error)
      if (shouldRedirect) window.location.href = '/'
    });
  };

  const navigateToLogin = () => {
    setAuthError({
      type: 'auth_required',
      message: 'Authentication required'
    });
  };

  const requireLogin = useCallback((message) => {
    const next = {
      type: 'auth_required',
      message: message || 'Authentication required',
    }

    setAuthError((prev) => {
      if (prev?.type === next.type && prev?.message === next.message) return prev
      return next
    });

    return Promise.resolve();
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    logout,
    navigateToLogin,
    requireLogin,
    checkAppState,
  }), [
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    requireLogin,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};