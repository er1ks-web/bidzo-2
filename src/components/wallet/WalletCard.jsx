import { Wallet, Gift, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { LISTING_FEE } from '@/lib/wallet';
import { useI18n } from '@/lib/i18n.jsx';

const TX_LABELS = {
  top_up: 'Top-up',
  promo_credit: 'Promo credit',
  listing_fee: 'Listing fee',
  success_fee: 'Success fee',
  refund: 'Refund',
  admin_adjustment: 'Admin adjustment',
};

const TX_COLORS = {
  top_up: 'text-green-600',
  promo_credit: 'text-blue-600',
  listing_fee: 'text-red-500',
  success_fee: 'text-red-500',
  refund: 'text-green-600',
  admin_adjustment: 'text-yellow-600',
};

export default function WalletCard({ walletState, transactions = [], onTopUp }) {
  const { t } = useI18n();
  const { wallet_balance = 0, free_listings_remaining = 3 } = walletState || {};
  const recent = transactions.slice(0, 5);

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Balance section */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-foreground/60 text-sm font-medium mb-1">{t('wallet.walletBalance')}</p>
            <p className="text-4xl font-display font-bold">
              €{wallet_balance.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Gift className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">
                {free_listings_remaining} free listing{free_listings_remaining !== 1 ? 's' : ''} left
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onTopUp}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t('wallet.topUpButton')}
          </Button>
        </div>
      </div>

      {/* Fee info */}
      <div className="px-6 py-3 bg-muted/40 border-b flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('wallet.listingFeePerPost')}</span>
        <Badge variant="outline" className="font-semibold">€{LISTING_FEE.toFixed(2)}</Badge>
      </div>

      {/* Recent transactions */}
      <div className="p-6">
        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{t('wallet.recentActivity')}</p>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('wallet.noTransactions')}</p>
        ) : (
          <div className="space-y-3">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.amount >= 0
                      ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                      : <ArrowDownLeft className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description || TX_LABELS[tx.transaction_type] || tx.transaction_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.created_date ? format(new Date(tx.created_date), 'MMM d, HH:mm') : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${TX_COLORS[tx.transaction_type] || 'text-foreground'}`}>
                  {tx.amount === 0 ? 'Free' : tx.amount > 0 ? `+€${tx.amount.toFixed(2)}` : `-€${Math.abs(tx.amount).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}