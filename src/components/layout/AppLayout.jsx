import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import OnboardingGate from './OnboardingGate';
import DeletionPendingGate from './DeletionPendingGate';
import CursorDotGlow from './CursorDotGlow';
import AppTopBar from './AppTopBar';
import BottomTabBar from './BottomTabBar';
import { isNativeApp, setStatusBarTheme } from '@/lib/native';
import { useTheme } from '@/lib/ThemeContext.jsx';
import { NavBadgesProvider } from '@/lib/useNavBadges';

export default function AppLayout() {
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    setStatusBarTheme(effectiveTheme);
  }, [effectiveTheme]);

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
