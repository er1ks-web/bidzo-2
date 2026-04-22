import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
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
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptBidButton({ listing, onAccepted }) {
  const [loading, setLoading] = useState(false);

  if (!listing.current_bid || !listing.highest_bidder) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      // End the auction immediately and mark as sold_pending
      await base44.entities.Listing.update(listing.id, {
        status: 'sold_pending',
        auction_end: new Date().toISOString(),
      });

      // Create the transaction
      await base44.entities.AuctionTransaction.create({
        listing_id: listing.id,
        listing_title: listing.title,
        listing_image: listing.images?.[0] || null,
        seller_email: listing.seller_email,
        seller_name: listing.seller_name,
        buyer_email: listing.highest_bidder,
        buyer_name: listing.highest_bidder_name,
        winning_amount: listing.current_bid,
        status: 'sold_pending',
        buyer_confirmed: false,
        seller_confirmed: false,
      });

      toast.success('Bid accepted! The auction has ended and a transaction has been created.');
      onAccepted?.();
    } catch (err) {
      toast.error(err.message || 'Something went wrong.');
    }
    setLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-300"
          disabled={loading}
        >
          <CheckCircle2 className="w-4 h-4" />
          Accept Current Bid — €{listing.current_bid?.toFixed(2)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Accept Current Bid?</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately end the auction and accept{' '}
            <span className="font-semibold text-foreground">{listing.highest_bidder_name}</span>'s
            bid of{' '}
            <span className="font-semibold text-accent">€{listing.current_bid?.toFixed(2)}</span>.
            A transaction will be created and you'll need to complete it in the Transaction Room.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAccept}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Yes, Accept Bid
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}