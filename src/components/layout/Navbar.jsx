import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Search, Plus, MessageSquare, User, Gavel, Menu, Globe, Flame, Heart, LogOut, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: t('nav.home'), icon: Gavel },
    { to: '/browse', label: t('nav.browse'), icon: Search },
    { to: '/ending-soon', label: t('nav_extra.endingSoon'), icon: Flame },
    ...(isAuthenticated
      ? [
          { to: '/create', label: t('nav.sell'), icon: Plus },
          { to: '/messages', label: t('nav.messages'), icon: MessageSquare },
          { to: '/favourites', label: t('nav_extra.watchlist'), icon: Heart },
          { to: '/deals', label: t('deals.title'), icon: Trophy },
          { to: '/profile', label: t('nav.profile'), icon: User },
        ]
      : [{ to: '/login', label: t('profile.login') || 'Login', icon: User }]),
  ];



  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/browse?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src="https://media.base44.com/images/public/69c6629c38b4f05a07d13e7c/236f5728d_ChatGPT_Image_Mar_28__2026__06_25_47_PM-removebg-preview.png"

            alt="Bidzo" className="h-9 w-auto object-contain"

            style={{ maxWidth: '110px' }} />
            
          </Link>

          {/* Search - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('nav.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
              
            </div>
          </form>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) =>
            <Link key={to} to={to} onClick={() => {
              if (to === '/deals') {
                localStorage.setItem('tx_last_seen', new Date().toISOString());
              }
            }}>
                <Button
                variant={location.pathname === to ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2">
                  <span className="relative">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'lv' ? 'en' : 'lv')}
              className="ml-2 gap-1.5">
              
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">{lang}</span>
            </Button>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLang(lang === 'lv' ? 'en' : 'lv')}>
              
              <Globe className="w-4 h-4" />
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-2 mt-8">
                  <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('nav.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10" />
                      
                    </div>
                  </form>
                  {navLinks.map(({ to, label, icon: Icon }) =>
                  <Link key={to} to={to} onClick={() => {
                    setMobileOpen(false);
                    if (to === '/deals') {
                      localStorage.setItem('tx_last_seen', new Date().toISOString());
                    }
                  }}>
                      <Button
                      variant={location.pathname === to ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3">
                        <span className="relative">
                          <Icon className="w-5 h-5" />
                        </span>
                        {label}
                      </Button>
                    </Link>
                  )}
                  {isAuthenticated && user && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => logout()}>
                        
                        <LogOut className="w-5 h-5" />
                        {t('nav_extra.logOut')}
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>);

}