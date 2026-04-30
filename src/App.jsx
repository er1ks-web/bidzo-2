import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { I18nProvider } from '@/lib/i18n.jsx';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import ListingDetail from '@/pages/ListingDetail';
import CreateListing from '@/pages/CreateListing';
import Messages from '@/pages/Messages';
import Profile from '@/pages/Profile.jsx';
import Login from '@/pages/Login';
import Admin from '@/pages/Admin';
import EndingSoon from '@/pages/EndingSoon';
import Favourites from '@/pages/Favourites';
import PublicProfile from '@/pages/PublicProfile';
import Deals from '@/pages/Transactions';
import About from '@/pages/About';
import HowItWorks from '@/pages/HowItWorks';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import AuthCallback from '@/pages/AuthCallback';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

const AuthenticatedApp = () => {
  const { isLoadingPublicSettings } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/seller/:id" element={<PublicProfile />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/ending-soon" element={<EndingSoon />} />

        {/* Protected pages — auth required */}
        <Route path="/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminGuard><Admin /></AdminGuard></ProtectedRoute>} />
        <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <I18nProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </I18nProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App