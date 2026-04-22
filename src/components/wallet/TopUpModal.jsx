import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, CheckCircle, Loader2 } from 'lucide-react';
import { topUpWallet, MIN_TOPUP } from '@/lib/wallet';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n.jsx';

const QUICK_AMOUNTS = [5, 10, 20, 50];

export default function TopUpModal({ open, onClose, user, walletBalance, onSuccess }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const selectedAmount = parseFloat(amount);
  const isValid = !isNaN(selectedAmount) && selectedAmount >= MIN_TOPUP;

  const handleTopUp = async () => {
    if (!isValid) return;
    setLoading(true);
    const newBalance = await topUpWallet(user, selectedAmount, walletBalance);
    setLoading(false);
    setDone(true);
    toast.success(t('wallet.topUpWallet') + ' - €' + selectedAmount.toFixed(2));
    setTimeout(() => {
      setDone(false);
      setAmount('');
      onSuccess?.(newBalance);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-accent" />
              {t('wallet.topUpWallet')}
            </DialogTitle>
          </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-lg">{t('wallet.paymentSuccessful')}</p>
            <p className="text-muted-foreground text-sm">{t('wallet.newBalance').replace('{balance}', (walletBalance + selectedAmount).toFixed(2))}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('wallet.currentBalanceLabel')}</p>
              <p className="text-2xl font-bold font-display">€{(walletBalance ?? 0).toFixed(2)}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">{t('wallet.quickAmounts')}</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`rounded-lg py-2 text-sm font-semibold border transition-colors ${
                      amount === String(a)
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-muted border-border hover:border-accent'
                    }`}
                  >
                    €{a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5">{t('wallet.customAmount')}</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={MIN_TOPUP}
                  step="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={t('wallet.minTopUp').replace('{min}', MIN_TOPUP)}
                  className="pl-7"
                />
              </div>
              {amount && !isValid && (
                <p className="text-xs text-destructive mt-1">{t('wallet.minimumTopUpError').replace('{min}', MIN_TOPUP)}</p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              {t('wallet.securePayment')}
            </div>

            <Button
              onClick={handleTopUp}
              disabled={!isValid || loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('wallet.topUpButtonText').replace('{amount}', isValid ? selectedAmount.toFixed(2) : '—')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}