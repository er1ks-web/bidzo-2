import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Mail, Instagram } from 'lucide-react';

export default function Footer() {
  const { t, lang } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0d0d0d] text-white/80 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Branding */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-display font-bold text-white">Bidzo</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 font-semibold px-1.5 py-0.5 rounded-md">{lang.toUpperCase()}</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-[200px]">{t('footer.tagline')}</p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{t('footer.platform')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-yellow-400 transition-colors">{t('footer.home')}</Link></li>
              <li><Link to="/browse" className="hover:text-yellow-400 transition-colors">{t('footer.browse')}</Link></li>
              <li><Link to="/create" className="hover:text-yellow-400 transition-colors">{t('footer.sell')}</Link></li>
              <li><Link to="/ending-soon" className="hover:text-yellow-400 transition-colors">{t('footer.endingSoon')}</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{t('footer.info')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="hover:text-yellow-400 transition-colors">{t('footer.about')}</Link></li>
              <li><Link to="/how-it-works" className="hover:text-yellow-400 transition-colors">{t('footer.howItWorks')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/terms" className="hover:text-yellow-400 transition-colors">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="cursor-pointer pointer-events-auto hover:text-yellow-400 transition-colors">{t('footer.privacy')}</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:info@bidzo.lv" className="flex items-center gap-2 hover:text-yellow-400 transition-colors">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  info@bidzo.lv
                </a>
              </li>
            </ul>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mt-6 mb-4">{t('footer.social')}</h4>
            <div className="flex gap-3">
              <a href="https://www.instagram.com/bidzo.lv" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors">
                {/* TikTok icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/35">
          <span>© {year} Bidzo. {t('footer.rights')}</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-white/60 transition-colors">{t('footer.terms')}</Link>
            <Link to="/privacy" className="cursor-pointer pointer-events-auto hover:text-white/60 transition-colors">{t('footer.privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
