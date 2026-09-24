import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gavel, Search, Plus, MessageSquare, Menu } from 'lucide-react';
import { useI18n } from '@/lib/i18n.jsx';
import { useNavBadges } from '@/lib/useNavBadges';
import { cn } from '@/lib/utils';

export const TAB_ROOTS = ['/', '/browse', '/create', '/messages', '/menu'];

function isTyping(el) {
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

// App-only bottom navigation (see AppLayout). Replaces the website's navbar
// menu and footer inside the Android/iOS app.
export default function BottomTabBar() {
  const { t } = useI18n();
  const location = useLocation();
  const { unreadCount, hasUnseenDeals, hasUnseenOutbid } = useNavBadges();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // The on-screen keyboard pushes fixed elements up, so the bar would sit on
  // top of whatever the user is typing into -- hide it while an input has focus.
  useEffect(() => {
    const onFocusIn = (e) => setKeyboardOpen(isTyping(e.target));
    const onFocusOut = () => setTimeout(() => setKeyboardOpen(isTyping(document.activeElement)), 50);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (keyboardOpen) return null;

  const tabs = [
    { to: '/', label: t('nav.home'), icon: Gavel },
    { to: '/browse', label: t('nav.browse'), icon: Search },
    { to: '/create', label: t('nav.sell'), icon: Plus, primary: true },
    { to: '/messages', label: t('nav.messages'), icon: MessageSquare, dot: unreadCount > 0 },
    { to: '/menu', label: t('nav_extra.menu'), icon: Menu, dot: hasUnseenDeals || hasUnseenOutbid },
  ];

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/60 select-none">
      <div className="grid grid-cols-5 h-16">
        {tabs.map(({ to, label, icon: Icon, dot, primary }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              replace={active}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              {primary ? (
                <span className="w-11 h-11 -mt-1 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-black/30">
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="relative">
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.4 : 1.8} />
                  {dot && <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 ring-2 ring-card" />}
                </span>
              )}
              {!primary && <span className="leading-none">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
