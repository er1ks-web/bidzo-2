import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n.jsx';
import { requestAccountDeletion, formatDeletionDate } from '@/lib/accountDeletion';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Settings -> "Delete account". Schedules deletion in 48 hours and logs the user out.
export default function DeleteAccountCard() {
  const { t, lang } = useI18n();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockers, setBlockers] = useState(null);

  const openDialog = () => {
    setBlockers(null);
    setOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await requestAccountDeletion();
      if (!result?.ok) {
        setBlockers(result?.blockers || {});
        return;
      }
      toast.success(t('account_deletion.requested').replace('{date}', formatDeletionDate(result.scheduled_for, lang)));
      setOpen(false);
      logout();
    } catch (e) {
      console.log(e);
      toast.error(t('account_deletion.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const blockerLines = blockers
    ? [
        ['active_listings', 'blockedListings'],
        ['open_deals', 'blockedDeals'],
        ['leading_bids', 'blockedBids'],
      ]
        .filter(([key]) => Number(blockers[key]) > 0)
        .map(([key, label]) => t(`account_deletion.${label}`).replace('{count}', blockers[key]))
    : [];

  return (
    <div className="bg-card rounded-xl border border-destructive/40 p-6 mt-6">
      <h2 className="text-sm font-semibold text-destructive uppercase tracking-wide mb-2">{t('account_deletion.dangerZone')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t('account_deletion.settingsDesc')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="destructive" onClick={openDialog} className="gap-2">
          <Trash2 className="w-4 h-4" />
          {t('account_deletion.deleteButton')}
        </Button>
        <Link to="/account-deletion" className="text-xs text-muted-foreground underline underline-offset-2">
          {t('account_deletion.pageTitle')}
        </Link>
      </div>

      <AlertDialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
        <AlertDialogContent>
          {blockers ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('account_deletion.blockedTitle')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('account_deletion.blockedIntro')}</p>
                    <ul className="list-disc pl-5 space-y-1 text-foreground">
                      {blockerLines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('account_deletion.cancel')}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('account_deletion.confirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>{t('account_deletion.confirmBody')}</p>
                    <p>{t('account_deletion.confirmErased')}</p>
                    <p>{t('account_deletion.confirmKept')}</p>
                    <p className="font-medium text-foreground">{t('account_deletion.confirmWallet')}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={submitting}>{t('account_deletion.cancel')}</AlertDialogCancel>
                {/* Plain Button, not AlertDialogAction, so the dialog stays open to show blockers. */}
                <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
                  {t('account_deletion.confirmAction')}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
