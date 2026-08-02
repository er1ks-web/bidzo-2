import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase';
import EditProfileCard from '@/components/profile/EditProfileCard';

export default function OnboardingGate() {
  const { user: authUser, isAuthenticated, needsOnboarding, checkAppState, logout } = useAuth();
  const { lang, t } = useI18n();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !needsOnboarding || !authUser?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,phone_number,city,profile_picture_url,bio')
        .eq('id', authUser.id)
        .limit(1)

      if (error) console.log(error)
      setProfile(Array.isArray(data) ? (data[0] || null) : null)
    })()
  }, [isAuthenticated, needsOnboarding, authUser?.id]);

  if (!isAuthenticated || !needsOnboarding) return null;

  const cardUser = {
    id: authUser.id,
    email: authUser.email,
    full_name: authUser.user_metadata?.full_name || authUser.email,
    created_date: authUser.created_at,
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-4">
            <h1 className="text-xl font-display font-bold">
              {lang === 'lv' ? 'Izvēlies lietotājvārdu' : 'Choose a username'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === 'lv'
                ? 'Citi pircēji un pārdevēji redz tavu lietotājvārdu sludinājumos un publiskajā profilā — izvēlies to, lai turpinātu.'
                : 'Other buyers and sellers see your username on listings and your public profile — pick one to continue.'}
            </p>
          </div>

          <EditProfileCard
            user={cardUser}
            profile={profile}
            lang={lang}
            onProfileSaved={checkAppState}
          />

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              {t('profile.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
