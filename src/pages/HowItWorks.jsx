import { Link } from 'react-router-dom';
import { ArrowRight, User, Package, Gavel, Trophy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n.jsx';

const STEP_ICONS = [User, Package, Gavel, Trophy, CheckCircle2];

export default function HowItWorks() {
  const { t } = useI18n();
  const steps = t('page_how_it_works.steps') || [];
  const faq = t('page_how_it_works.faq') || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
          {t('page_how_it_works.badge')}
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-5">
          {t('page_how_it_works.title')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t('page_how_it_works.subtitle')}
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6 mb-16">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i] || User;
          return (
            <div key={step.title} className="flex gap-6">
              <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-display font-bold text-lg shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xl font-display font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-card rounded-2xl border p-8 sm:p-10 mb-10">
        <h2 className="text-2xl font-display font-bold mb-6">{t('page_how_it_works.faqTitle')}</h2>
        <div className="space-y-6">
          {faq.map((item) => (
            <div key={item.q}>
              <h3 className="font-semibold mb-2">{item.q}</h3>
              <p className="text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">{t('page_how_it_works.ctaTitle')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('page_how_it_works.ctaSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/browse">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6">
              {t('page_how_it_works.startBrowsing')} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/create">
            <Button variant="outline" className="gap-2 px-6">
              {t('page_how_it_works.createListing')}
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}
