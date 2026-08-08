import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n.jsx';

// Shared renderer for Terms/Privacy -- both are the same shape (title +
// optional AI-translation disclaimer + numbered sections of paragraphs,
// sub-headings and bullet lists), driven entirely by i18n data so every
// language stays in sync from one source instead of three near-duplicate
// page files.
export default function LegalPage({ translationKey }) {
  const { t } = useI18n();
  const title = t(`${translationKey}.title`);
  const disclaimer = t(`${translationKey}.disclaimer`);
  const sections = t(`${translationKey}.sections`) || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-display font-bold mb-6">{title}</h1>

      {disclaimer && (
        <div className="mb-10 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">{disclaimer}</p>
        </div>
      )}
      {!disclaimer && <div className="mb-10" />}

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold text-foreground mb-3">{section.heading}</h2>
            {section.blocks.map((block, i) => {
              if (typeof block === 'string') {
                return <p key={i} className={i > 0 ? 'mt-2' : ''}>{block}</p>;
              }
              if (block.h3) {
                return <h3 key={i} className="font-semibold text-foreground mt-4">{block.h3}</h3>;
              }
              if (block.ul) {
                return (
                  <ul key={i} className="list-disc list-inside space-y-1 mt-2">
                    {block.ul.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                );
              }
              return null;
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
