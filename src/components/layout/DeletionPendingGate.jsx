import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n.jsx';
import { getPendingAccountDeletion, cancelAccountDeletion, formatDeletionDate } from '@/lib/accountDeletion';
import { Button } from '@/components/ui/button';

// Full-screen block for a user who asked for their account to be deleted and
// logged back in during the 48-hour grace period: cancel the deletion or log out.
export default function DeletionPendingGate() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, lang } = useI18n();
  const [scheduledFor, setScheduledFor] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setScheduledFor(null);
      return;
    }
    let cancelled = false;
    getPendingAccountDeletion(user.id)
      .then((when) => { if (!cancelled) setScheduledFor(when); })
      .catch((e) => console.log(e));
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  if (!scheduledFor) return null;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelAccountDeletion();
      setScheduledFor(null);
      toast.success(t('account_deletion.cancelled'));
    } catch (e) {
      console.log(e);
      toast.error(t('account_deletion.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-destructive/15 flex items-center justify-center">
          <Trash2 className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-xl font-display font-bold">{t('account_deletion.pendingTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('account_deletion.pendingBody').replace('{date}', formatDeletionDate(scheduledFor, lang))}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleCancel} disabled={cancelling} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {t('account_deletion.cancelDeletion')}
          </Button>
          <Button variant="ghost" onClick={() => logout()} disabled={cancelling}>
            {t('account_deletion.logOut')}
          </Button>
        </div>
      </div>
    </div>
  );
}
