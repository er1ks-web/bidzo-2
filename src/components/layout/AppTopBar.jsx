import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext.jsx';
import { TAB_ROOTS } from './BottomTabBar';

// Same logos as the website Navbar: white text on dark, dark text on light.
const LOGO_URLS = {
  dark: 'https://xnadmnketxbquyrgqmcs.supabase.co/storage/v1/object/public/site-assets/bidzo-web-logo-new.png',
  light: 'https://xnadmnketxbquyrgqmcs.supabase.co/storage/v1/object/public/site-assets/bidzo-web-logo-new-inverted.png',
};

// App-only slim header (see AppLayout): logo on the main tabs, a back arrow
// on everything deeper, and a shortcut to Ending soon.
export default function AppTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const isTabRoot = TAB_ROOTS.includes(location.pathname);
  const onEndingSoon = location.pathname === '/ending-soon';

  const goBack = () => {
    // React Router keeps its own history index; 0 means there's nothing to go back to.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/60 select-none">
      <div className="flex items-center h-14 px-2">
        {isTabRoot ? (
          <Link to="/" className="px-2">
            <img
              src={LOGO_URLS[effectiveTheme] || LOGO_URLS.dark}
              alt="Bidzo"
              className="h-8 w-auto object-contain"
              style={{ maxWidth: '100px' }}
            />
          </Link>
        ) : (
          <button onClick={goBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-muted">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div className="flex-1" />
        <Link
          to="/ending-soon"
          aria-label="Ending soon"
          className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-muted ${onEndingSoon ? 'text-accent' : ''}`}
        >
          <Flame className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
