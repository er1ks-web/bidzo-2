import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/supabase'

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
    setIsLoadingPublicSettings(true);
    setAuthError(null);
    setAppPublicSettings(null);
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);

      const { data, error } = await supabase.auth.getUser();
      if (error) console.log(error)

      const currentUser = data?.user || null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);

      // Ensure a profile record exists (Google + email/password).
      // Also detect onboarding needed if required fields are missing.
      if (currentUser?.id && currentUser?.email) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .limit(1)

          if (profileError) console.log(profileError)

          const profile = Array.isArray(profileData) ? (profileData[0] || null) : null
          if (!profile) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: currentUser.id,
                email: currentUser.email,
                full_name: currentUser.user_metadata?.full_name || currentUser.email,
                profile_picture_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
              })

            if (insertError) console.log(insertError)
            setNeedsOnboarding(true)
          } else {
            const missingUsername = !profile.username
            const missingPhone = !profile.phone_number
            setNeedsOnboarding(missingUsername || missingPhone)
          }
        } catch (e) {
          console.log(e)
        }
      } else {
        setNeedsOnboarding(false)
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setNeedsOnboarding(false)
      
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
    needsOnboarding,
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
    needsOnboarding,
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