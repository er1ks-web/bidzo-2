import { useState } from 'react';
import { supabase } from '@/supabase'
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function BuyNowPanel({ listing, user, onSuccess }) {
  const { requireLogin } = useAuth();
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleBuyNow = async () => {
    if (!user) {
      requireLogin(t('buy_now_panel.loginToBuyNow'));
      return;
    }
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      console.log('[BuyNow] start', { listingId: listing?.id, now })

      const buyerId = user?.id
      const sellerId = listing?.seller_id
      console.log('[BuyNow] ids', { buyerId, sellerId })
      if (!buyerId || !sellerId) {
        toast.error(t('buy_now_panel.missingInfo'))
        return
      }

      if (!listing?.buy_now_price) {
        toast.error(t('buy_now_panel.notAvailable'))
        return
      }

      // Prevent double purchases: verify latest listing state
      const { data: listingRows, error: listingReadError } = await supabase
        .from('listings')
        .select('id, status, is_sold, auction_end')
        .eq('id', listing.id)
        .limit(1)

      if (listingReadError) console.log(listingReadError)
      const latest = Array.isArray(listingRows) ? (listingRows[0] || null) : null
      const latestHasEnded = !!(latest?.auction_end && new Date(latest.auction_end) < new Date())
      const latestUnavailable = !latest || latest?.is_sold || latest?.status !== 'active' || latestHasEnded
      console.log('[BuyNow] latest listing state', { latest, latestHasEnded, latestUnavailable })
      if (latestUnavailable) {
        toast.error(t('buy_now_panel.noLongerAvailable'))

        queryClient.invalidateQueries({ queryKey: ['listing', listing.id] })
        queryClient.invalidateQueries({ queryKey: ['listings-browse'] })
        return
      }

      // If a transaction already exists for this listing, don't create another
      const { data: existingTx, error: existingTxError } = await supabase
        .from('auction_transactions')
        .select('id')
        .eq('listing_id', listing.id)
        .limit(1)

      if (existingTxError) console.log(existingTxError)
      if (Array.isArray(existingTx) && existingTx[0]) {
        console.log('[BuyNow] existingTx found', existingTx[0])
        toast.error(t('buy_now_panel.alreadyPurchased'))

        queryClient.setQueryData(['listing', listing.id], (prev) => {
          if (!prev || typeof prev !== 'object') return prev
          return {
            ...prev,
            status: 'sold_pending',
          }
        })
        queryClient.invalidateQueries({ queryKey: ['listing', listing.id] })
        queryClient.invalidateQueries({ queryKey: ['listings-browse'] })
        return
      }

      console.log('[BuyNow] invoking rpc buy_now')
      const { data: txId, error: rpcError } = await supabase.rpc('buy_now', {
        p_listing_id: listing.id,
      })

      console.log('[BuyNow] rpc buy_now result', { txId, rpcError })

      if (rpcError) {
        toast.error(rpcError.message || t('buy_now_panel.buyNowFailed'))
        return
      }

      queryClient.setQueryData(['listing', listing.id], (prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...prev,
          status: 'sold_pending',
          is_sold: false,
          highest_bidder: user.email,
          highest_bidder_name: user.full_name,
          current_bid: listing.buy_now_price,
          auction_end: now,
        }
      })

      queryClient.invalidateQueries({ queryKey: ['listings-browse'] })
      queryClient.invalidateQueries({ queryKey: ['listing', listing.id] })
      queryClient.invalidateQueries({ queryKey: ['tx-buyer'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['tx-seller'], exact: false })

      console.log('[BuyNow] success')

      toast.success(t('listing_extra.purchaseConfirmed'));
      onSuccess?.();
    } catch (err) {
      console.log(err)
      toast.error(t('listing_extra.somethingWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [descBeforeTitle, descAfterTitle] = t('buy_now_panel.confirmDesc').split('{title}');
  const [descMiddle, descAfterAmount] = descAfterTitle.split('{amount}');

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t('buy_now_panel.title')}</span>
        </div>
        <span className="text-lg font-bold font-display text-foreground">
          €{listing.buy_now_price?.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('buy_now_panel.skipAuction')}
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            disabled={isSubmitting}
          >
            <Zap className="w-4 h-4" />
            {isSubmitting ? t('buy_now_panel.processing') : t('buy_now_panel.buyNowFor').replace('{amount}', listing.buy_now_price?.toFixed(2))}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('buy_now_panel.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {descBeforeTitle}<strong>{listing.title}</strong>{descMiddle}
              <strong>€{listing.buy_now_price?.toFixed(2)}</strong>{descAfterAmount}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('create_extra.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBuyNow}>
              {t('buy_now_panel.confirmPurchase')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
