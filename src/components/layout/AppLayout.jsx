import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import OnboardingGate from './OnboardingGate';
import DeletionPendingGate from './DeletionPendingGate';
import CursorDotGlow from './CursorDotGlow';
import AppTopBar from './AppTopBar';
import BottomTabBar from './BottomTabBar';
import InAppNotificationBanner from './InAppNotificationBanner';
import { isNativeApp, setStatusBarTheme } from '@/lib/native';
import { useTheme } from '@/lib/ThemeContext.jsx';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/supabase';
import { startPush, setPushNavigator } from '@/lib/push';
import { NavBadgesProvider } from '@/lib/useNavBadges';

export default function AppLayout() {
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    setStatusBarTheme(effectiveTheme);
  }, [effectiveTheme]);

  // App only: tapped notifications open their page, and a logged-in user's phone is
  // registered for push. apply_app_signup_defaults turns email off for accounts created
  // in the app (no-op for everyone else).
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    if (!isNativeApp) return;
    setPushNavigator(navigate);
    return () => setPushNavigator(null);
  }, [navigate]);
  useEffect(() => {
    if (!isNativeApp || !user?.id) return;
    supabase.rpc('apply_app_signup_defaults').then(({ error }) => { if (error) console.log(error); });
    startPush();
  }, [user?.id]);

  // Inside the Android/iOS app: slim top bar + bottom tabs, no footer.
  if (isNativeApp) {
    return (
      <NavBadgesProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <AppTopBar />
          <main className="flex-1 pb-20">
            <Outlet />
          </main>
          <BottomTabBar />
          <InAppNotificationBanner />
          <OnboardingGate />
          <DeletionPendingGate />
        </div>
      </NavBadgesProvider>
    );
  }

  return (
    <NavBadgesProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <CursorDotGlow />
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <OnboardingGate />
        <DeletionPendingGate />
      </div>
    </NavBadgesProvider>
  );
}
