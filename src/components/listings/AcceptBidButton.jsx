import { useState } from 'react';
import { supabase } from '@/supabase'
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

  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''));

  const handleAccept = async () => {
    toast.error('Accept Bid is temporarily disabled while security upgrades are applied.');
    return;

    setLoading(true);
    try {
      // End the auction immediately and mark as sold_pending
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          status: 'sold_pending',
          auction_end: new Date().toISOString(),
        })
        .eq('id', listing.id)

      if (updateError) throw updateError

      // Create the transaction
      let buyerId = listing.highest_bidder
      const sellerId = listing.seller_id

      if (buyerId && !isUuid(buyerId)) {
        const { data: buyerProfiles, error: buyerProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', buyerId)
          .limit(1)

        if (buyerProfileError) throw buyerProfileError
        const row = Array.isArray(buyerProfiles) ? (buyerProfiles[0] || null) : null
        buyerId = row?.id || null
      }

      if (!buyerId || !sellerId) {
        throw new Error('Missing buyer or seller id for transaction')
      }

      const { error: insertError } = await supabase
        .from('auction_transactions')
        .insert({
          listing_id: listing.id,
          listing_title: listing.title,
          listing_image: listing.images?.[0] || null,
          seller_id: sellerId,
          buyer_id: buyerId,
          winning_amount: listing.current_bid,
          status: 'sold_pending',
          buyer_confirmed: false,
          seller_confirmed: false,
        })

      if (insertError) throw insertError

      toast.success('Bid accepted! The auction has ended and a transaction has been created.');
      onAccepted?.();
    } catch (err) {
      toast.error(err?.message || 'Something went wrong.');
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