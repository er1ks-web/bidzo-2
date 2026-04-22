import { Gift, Wallet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LISTING_FEE } from '@/lib/wallet';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';

export default function PublishFeeBanner({ eligibility, walletState, onTopUp }) {
  const { t } = useI18n();
  const { free_listings_remaining = 0, wallet_balance = 0 } = walletState || {};

  if (!eligibility) return null;

  if (eligibility.usesFree) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
        <Gift className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{t('wallet.freeListingUsed')}</p>
          <p className="text-xs mt-0.5 text-green-700">
            {t('wallet.freeListingsRemaining').replace('{count}', free_listings_remaining).replace('{plural}', free_listings_remaining !== 1 ? 's' : '')}
          </p>
        </div>
      </div>
    );
  }

  if (eligibility.usesWallet) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
        <Wallet className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{t('wallet.walletDeducted').replace('{fee}', LISTING_FEE.toFixed(2))}</p>
          <p className="text-xs mt-0.5 text-blue-700">
            {t('wallet.currentBalance').replace('{current}', wallet_balance.toFixed(2)).replace('{after}', (wallet_balance - LISTING_FEE).toFixed(2))}
          </p>
        </div>
      </div>
    );
  }

  // Cannot publish
  return (
    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{t('wallet.insufficientBalance')}</p>
          <p className="text-xs mt-0.5 text-red-700">
            {t('wallet.needMinimum').replace('{fee}', LISTING_FEE.toFixed(2))}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onTopUp}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
      >
        {t('wallet.topUpWallet')}
      </Button>
    </div>
  );
}