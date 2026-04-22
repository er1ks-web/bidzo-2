import { useI18n } from '@/lib/i18n.jsx';
import { format } from 'date-fns';
import { User, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BidHistory({ bids, currentUserEmail }) {
  const { t } = useI18n();

  if (!bids?.length) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {t('listing.noBids')}
      </div>
    );
  }

  // Find the latest bid by the current user
  const userLatestBidId = currentUserEmail
    ? bids.find(b => b.bidder_email === currentUserEmail)?.id
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h3 className="font-semibold">{t('listing.bidHistory')}</h3>
        <span className="text-sm text-muted-foreground">({bids.length})</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {bids.map((bid, i) => {
          const isTop = i === 0;
          const isUserLatest = bid.id === userLatestBidId;

          return (
            <motion.div
              key={bid.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={[
                'flex items-center justify-between p-3 rounded-lg transition-all duration-300',
                isUserLatest
                  ? 'bg-accent/15 border border-accent/40 shadow-[0_0_12px_rgba(245,197,24,0.15)]'
                  : isTop
                  ? 'bg-accent/10 border border-accent/20'
                  : 'bg-muted/50',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUserLatest ? 'bg-accent/20' : 'bg-primary/10'}`}>
                  <User className={`w-4 h-4 ${isUserLatest ? 'text-accent' : 'text-primary'}`} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${isUserLatest ? 'text-accent' : ''}`}>
                    {bid.bidder_name || 'Anonymous'}
                    {isUserLatest && <span className="ml-2 text-[10px] font-semibold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">You</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(bid.created_date), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
              <span className={`font-bold ${isTop ? 'text-accent' : ''}`}>
                €{bid.amount?.toFixed(2)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}