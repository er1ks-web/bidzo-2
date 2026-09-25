import { Toaster } from 'sonner'
import { Check, AlertCircle, AlertTriangle, Bell } from 'lucide-react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { I18nProvider } from '@/lib/i18n.jsx';
import { ThemeProvider } from '@/lib/ThemeContext.jsx';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import ListingDetail from '@/pages/ListingDetail';
import CreateListing from '@/pages/CreateListing';
import Messages from '@/pages/Messages';
import Profile from '@/pages/Profile.jsx';
import Login from '@/pages/Login';
import EndingSoon from '@/pages/EndingSoon';
import Favourites from '@/pages/Favourites';
import PublicProfile from '@/pages/PublicProfile';
import Deals from '@/pages/Transactions';
import About from '@/pages/About';
import HowItWorks from '@/pages/HowItWorks';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import AuthCallback from '@/pages/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';
import Settings from '@/pages/Settings';
import Menu from '@/pages/Menu';
import AccountDeletion from '@/pages/AccountDeletion';
import { isNativeApp, hideSplash } from '@/lib/native';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

const AuthenticatedApp = () => {
  const { isLoadingPublicSettings } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // In the app, swap the launch screen straight for the first real page.
  useEffect(() => {
    if (!isLoadingPublicSettings) hideSplash();
  }, [isLoadingPublicSettings]);

  if (isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-medium">Bidzo</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public pages — no auth required */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/seller/:id" element={<PublicProfile />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/ending-soon" element={<EndingSoon />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />
        {/* Protected pages — auth required */}
        <Route path="/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


// Round coloured badge used as the toast icon (the only thing that differs between toast types).
function ToastIcon({ className, children }) {
  return <span className={`w-9 h-9 rounded-full flex items-center justify-center ${className}`}>{children}</span>;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <I18nProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster
              position="bottom-center"
              // Keep toasts clear of the app's bottom tab bar.
              mobileOffset={isNativeApp ? { bottom: 88 } : undefined}
              // Every toast uses the same dark card as the in-app notification banner
              // (InAppNotificationBanner.jsx); success/error/info only differ by the
              // small coloured icon badge on the left.
              icons={{
                success: <ToastIcon className="bg-emerald-500/15 text-emerald-400"><Check className="w-4 h-4" strokeWidth={3} /></ToastIcon>,
                error: <ToastIcon className="bg-red-500/15 text-red-400"><AlertCircle className="w-4 h-4" strokeWidth={2.5} /></ToastIcon>,
                warning: <ToastIcon className="bg-amber-500/15 text-amber-400"><AlertTriangle className="w-4 h-4" strokeWidth={2.5} /></ToastIcon>,
                info: <ToastIcon className="bg-accent/15 text-accent"><Bell className="w-4 h-4" strokeWidth={2.5} /></ToastIcon>,
              }}
              toastOptions={{
                classNames: {
                  toast: '!rounded-2xl !bg-[#1A1A1A] !border !border-white/10 !shadow-2xl !shadow-black/50 !text-white !gap-3 !p-3.5',
                  icon: '!w-9 !h-9 !m-0 shrink-0',
                  title: '!font-bold !text-white !text-sm',
                  description: '!text-white/70 !text-sm',
                  actionButton: '!bg-accent !text-accent-foreground !font-semibold',
                  cancelButton: '!bg-white/10 !text-white',
                },
              }}
            />
            <SpeedInsights />
            <Analytics />
          </I18nProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App