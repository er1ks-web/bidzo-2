import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
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

  const handleBuyNow = async () => {
    if (!user) {
      requireLogin('Log in to buy now');
      return;
    }
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      // 1. Close the auction — mark as sold_pending with buyer as winner
      await base44.entities.Listing.update(listing.id, {
        status: 'sold_pending',
        highest_bidder: user.email,
        highest_bidder_name: user.full_name,
        current_bid: listing.buy_now_price,
        auction_end: now,
      });

      // 2. Create AuctionTransaction record
      await base44.entities.AuctionTransaction.create({
        listing_id: listing.id,
        listing_title: listing.title,
        listing_image: listing.images?.[0] || '',
        seller_email: listing.seller_email,
        seller_name: listing.seller_name,
        buyer_email: user.email,
        buyer_name: user.full_name,
        winning_amount: listing.buy_now_price,
        status: 'sold_pending',
        buyer_confirmed: false,
        seller_confirmed: false,
      });

      // 3. Email buyer
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `You bought "${listing.title}" instantly!`,
        body: `Hi ${user.full_name},\n\nYou used Buy Now to purchase "${listing.title}" for €${listing.buy_now_price?.toFixed(2)}.\n\nPlease visit your Transaction Room to confirm and complete the deal.\n\nBidzo`,
      }).catch(() => {});

      // 4. Email seller
      await base44.integrations.Core.SendEmail({
        to: listing.seller_email,
        subject: `Your item "${listing.title}" was bought instantly!`,
        body: `Hi ${listing.seller_name},\n\n${user.full_name} used Buy Now to purchase "${listing.title}" for €${listing.buy_now_price?.toFixed(2)}.\n\nPlease visit your Transaction Room to confirm the sale.\n\nBidzo`,
      }).catch(() => {});

      toast.success('Purchase confirmed! Check your Transaction Room.');
      onSuccess?.();
    } catch (err) {
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