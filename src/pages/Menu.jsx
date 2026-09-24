import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Heart, Trophy, Settings, HelpCircle, Info, FileText, Shield,
  Mail, Instagram, LogOut, ChevronRight, Check, UserX,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n.jsx';
import { useAuth } from '@/lib/AuthContext';
import { useNavBadges, markNavSeen } from '@/lib/useNavBadges';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'lv', label: 'Latviešu' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('fill-current', className)} xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  );
}

function Section({ title, children }) {
  return (
    <section>
      {title && <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>}
      <div className="bg-card/40 border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/60">
        {children}
      </div>
    </section>
  );
}

function Row({ to, href, icon: Icon, label, dot, onClick }) {
  const content = (
    <>
      <span className="relative">
        <Icon className="w-5 h-5 text-muted-foreground" />
        {dot && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </>
  );
  const className = 'flex items-center gap-3 px-4 py-3.5 active:bg-muted/60';
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>;
  }
  return <Link to={to} onClick={onClick} className={className}>{content}</Link>;
}

// App-only page reached from the bottom tab bar. Holds everything the
// website keeps in its navbar menu and footer.
export default function Menu() {
  const { t, lang, setLang } = useI18n();
  const { isAuthenticated, user, logout } = useAuth();
  const { hasUnseenDeals, hasUnseenOutbid } = useNavBadges();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('username,profile_picture_url')
      .eq('id', user.id)
      .limit(1)
      .then(({ data, error }) => {
        if (error) console.log(error);
        if (!cancelled) setProfile(Array.isArray(data) ? data[0] || null : null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const displayName = profile?.username || user?.full_name || user?.email || '';

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
      {isAuthenticated ? (
        <Link
          to="/profile"
          onClick={() => markNavSeen('/profile')}
          className="flex items-center gap-4 p-4 bg-card/40 border border-border/60 rounded-2xl active:bg-muted/60"
        >
          <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {profile?.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-lg truncate">{displayName}</div>
            <div className="text-sm text-muted-foreground">{t('nav_extra.viewProfile')}</div>
          </div>
          <span className="relative">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
            {hasUnseenOutbid && <span className="absolute -top-2 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />}
          </span>
        </Link>
      ) : (
        <div className="p-5 bg-card/40 border border-border/60 rounded-2xl text-center space-y-3">
          <div className="font-display font-bold text-lg">{t('nav_extra.guestTitle')}</div>
          <p className="text-sm text-muted-foreground">{t('nav_extra.guestSubtitle')}</p>
          <Link to="/login">
            <Button className="w-full mt-2 bg-accent text-accent-foreground hover:bg-accent/90">{t('profile.login')}</Button>
          </Link>
        </div>
      )}

      {isAuthenticated && (
        <Section>
          <Row to="/favourites" icon={Heart} label={t('nav_extra.watchlist')} />
          <Row to="/deals" icon={Trophy} label={t('deals.title')} dot={hasUnseenDeals} onClick={() => markNavSeen('/deals')} />
          <Row to="/settings" icon={Settings} label={t('profile.settings')} />
        </Section>
      )}

      <Section title={t('footer.info')}>
        <Row to="/how-it-works" icon={HelpCircle} label={t('footer.howItWorks')} />
        <Row to="/about" icon={Info} label={t('footer.about')} />
      </Section>

      <Section title={t('nav_extra.language')}>
        <div className="grid grid-cols-3 gap-2 p-2">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors',
                lang === code ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-foreground active:bg-muted'
              )}
            >
              {lang === code && <Check className="w-4 h-4" />}
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('footer.legal')}>
        <Row to="/terms" icon={FileText} label={t('footer.terms')} />
        <Row to="/privacy" icon={Shield} label={t('footer.privacy')} />
        <Row to="/account-deletion" icon={UserX} label={t('account_deletion.pageLink')} />
      </Section>

      <Section title={t('footer.contact')}>
        <Row href="mailto:info@bidzo.lv" icon={Mail} label="info@bidzo.lv" />
        <Row href="https://www.instagram.com/bidzo.lv" icon={Instagram} label="Instagram" />
        <Row href="https://www.tiktok.com/@bidzo.lv?lang=en" icon={TikTokIcon} label="TikTok" />
      </Section>

      {isAuthenticated && (
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/40 text-destructive text-sm font-semibold active:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          {t('nav_extra.logOut')}
        </button>
      )}

      <p className="text-center text-xs text-muted-foreground/70 pb-2">
        © {new Date().getFullYear()} Bidzo. {t('footer.rights')}
      </p>
    </div>
  );
}
