import { useState } from 'react';
import { supabase } from '@/supabase'
import { useAuth } from '@/lib/AuthContext';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleBuyNow = async () => {
    if (!user) {
      requireLogin('Log in to buy now');
      return;
    }
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      const buyerId = user?.id
      const sellerId = listing?.seller_id
      if (!buyerId || !sellerId) {
        toast.error('Missing buyer or seller info')
        return
      }

      // 1. Close the auction — mark as sold_pending with buyer as winner
      const { error: listingErr } = await supabase
        .from('listings')
        .update({
          status: 'sold_pending',
          is_sold: false,
          highest_bidder: user.email,
          highest_bidder_name: user.full_name,
          current_bid: listing.buy_now_price,
          auction_end: now,
        })
        .eq('id', listing.id)

      if (listingErr) {
        console.log(listingErr)
        toast.error('Could not complete Buy Now. Please try again.')
        return
      }

      // 2. Create AuctionTransaction record
      const { error: txErr } = await supabase
        .from('auction_transactions')
        .insert({
          listing_id: listing.id,
          seller_id: sellerId,
          buyer_id: buyerId,
          winning_amount: listing.buy_now_price,
          status: 'sold_pending',
          buyer_confirmed: false,
          seller_confirmed: false,
        })

      if (txErr) {
        console.log(txErr)
        toast.error('Purchase created, but deal record failed. Please contact support.')
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

      toast.success('Purchase confirmed! Check your Transaction Room.');
      onSuccess?.();
    } catch (err) {
      console.log(err)
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Buy Now</span>
        </div>
        <span className="text-lg font-bold font-display text-foreground">
          €{listing.buy_now_price?.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Skip the auction — purchase this item instantly at the Buy Now price.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            disabled={isSubmitting}
          >
            <Zap className="w-4 h-4" />
            {isSubmitting ? 'Processing...' : `Buy Now for €${listing.buy_now_price?.toFixed(2)}`}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm instant purchase</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to buy <strong>{listing.title}</strong> for{' '}
              <strong>€{listing.buy_now_price?.toFixed(2)}</strong> instantly. This will end the auction immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBuyNow}>
              Confirm Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}