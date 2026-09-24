import { useI18n } from '@/lib/i18n.jsx';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';

// Public page explaining how to delete an account. Its URL
// (https://www.bidzo.lv/account-deletion) is the one Google Play asks for.
export default function AccountDeletion() {
  const { t } = useI18n();

  return (
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-2">{t('account_deletion.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('account_deletion.pageIntro')}</p>
        </div>

        <section className="bg-card rounded-xl border p-6">
          <h2 className="font-semibold mb-3">{t('account_deletion.pageStepsTitle')}</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>{t('account_deletion.pageStep1')}</li>
            <li>{t('account_deletion.pageStep2')}</li>
            <li>{t('account_deletion.pageStep3')}</li>
            <li>{t('account_deletion.pageStep4')}</li>
          </ol>
        </section>

        {[
          ['pageBeforeTitle', 'pageBefore'],
          ['pageDeletedTitle', 'pageDeleted'],
          ['pageKeptTitle', 'pageKept'],
        ].map(([title, body]) => (
          <section key={title} className="bg-card rounded-xl border p-6">
            <h2 className="font-semibold mb-2">{t(`account_deletion.${title}`)}</h2>
            <p className="text-sm text-muted-foreground">{t(`account_deletion.${body}`)}</p>
          </section>
        ))}

        <p className="text-sm text-muted-foreground">{t('account_deletion.pageContact')}</p>
      </div>
    </div>
  );
}
