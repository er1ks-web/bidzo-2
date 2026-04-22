import { useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { user, isLoadingAuth, requireLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      requireLogin();
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isLoadingAuth, user, requireLogin, navigate, location.pathname]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}