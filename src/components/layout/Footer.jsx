import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Mail, Instagram, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const footerTranslations = {
  lv: {
    tagline: 'Pārdod vairāk. Pērc gudrāk.',
    platform: 'Platforma',
    home: 'Sākums',
    browse: 'Pārlūkot',
    sell: 'Pārdot',
    endingSoon: 'Beidzas drīz',
    info: 'Informācija',
    about: 'Par mums',
    howItWorks: 'Kā tas darbojas',
    legal: 'Juridiskā informācija',
    terms: 'Lietošanas noteikumi',
    privacy: 'Privātuma politika',
    contact: 'Kontakti',
    contactPage: 'Sazināties',
    social: 'Sociālie tīkli',
    rights: 'Visas tiesības aizsargātas.',
  },
  en: {
    tagline: 'Sell more. Buy smarter.',
    platform: 'Platform',
    home: 'Home',
    browse: 'Browse',
    sell: 'Sell',
    endingSoon: 'Ending Soon',
    info: 'Information',
    about: 'About Us',
    howItWorks: 'How It Works',
    legal: 'Legal',
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    contact: 'Contact',
    contactPage: 'Contact Us',
    social: 'Social Media',
    rights: 'All rights reserved.',
  },
};

export default function Footer() {
  const { lang } = useI18n();
  const f = footerTranslations[lang] || footerTranslations.lv;
  const year = new Date().getFullYear();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  return (
    <footer className="bg-[#0d0d0d] text-white/80 border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Branding */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-display font-bold text-white">Bidzo</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 font-semibold px-1.5 py-0.5 rounded-md">LV</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-[200px]">{f.tagline}</p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{f.platform}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-yellow-400 transition-colors">{f.home}</Link></li>
              <li><Link to="/browse" className="hover:text-yellow-400 transition-colors">{f.browse}</Link></li>
              <li><Link to="/create" className="hover:text-yellow-400 transition-colors">{f.sell}</Link></li>
              <li><Link to="/ending-soon" className="hover:text-yellow-400 transition-colors">{f.endingSoon}</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{f.info}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="hover:text-yellow-400 transition-colors">{f.about}</Link></li>
              <li><Link to="/how-it-works" className="hover:text-yellow-400 transition-colors">{f.howItWorks}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{f.legal}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/terms" className="hover:text-yellow-400 transition-colors">{f.terms}</Link></li>
              <li><Link to="/privacy" className="hover:text-yellow-400 transition-colors">{f.privacy}</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{f.contact}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:support@bidzo.lv" className="flex items-center gap-2 hover:text-yellow-400 transition-colors">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  support@bidzo.lv
                </a>
              </li>
            </ul>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mt-6 mb-4">{f.social}</h4>
            <div className="flex gap-3">
              <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" aria-label="TikTok" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors">
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
          <span>© {year} Bidzo. {f.rights}</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-white/60 transition-colors">{f.terms}</Link>
            <Link to="/privacy" className="hover:text-white/60 transition-colors">{f.privacy}</Link>
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" />
                {lang === 'lv' ? 'Administrācija' : 'Admin'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}