import { Link } from 'react-router-dom';
import { ShieldCheck, Gavel, Users, Zap, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n.jsx';

const VALUE_ICONS = [ShieldCheck, Gavel, Users, Zap];

export default function About() {
  const { t } = useI18n();
  const values = t('page_about.values') || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
          {t('page_about.badge')}
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-5">
          {t('page_about.title')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t('page_about.subtitle')}
        </p>
      </div>

      {/* Story */}
      <div className="bg-card rounded-2xl border p-8 sm:p-10 mb-10">
        <h2 className="text-2xl font-display font-bold mb-4">{t('page_about.storyTitle')}</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>{t('page_about.storyP1')}</p>
          <p>{t('page_about.storyP2')}</p>
          <p>{t('page_about.storyP3')}</p>
        </div>
      </div>

      {/* Values */}
      <div className="mb-10">
        <h2 className="text-2xl font-display font-bold mb-6">{t('page_about.valuesTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map((value, i) => {
            const Icon = VALUE_ICONS[i] || ShieldCheck;
            return (
              <div key={value.title} className="bg-card rounded-xl border p-6 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">{t('page_about.ctaTitle')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('page_about.ctaSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/browse">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6">
              {t('page_about.browseListings')} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="mailto:info@bidzo.lv">
            <Button variant="outline" className="gap-2 px-6">
              <Mail className="w-4 h-4" />
              {t('page_about.contactUs')}
            </Button>
          </a>
        </div>
      </div>

    </div>
  );
}
