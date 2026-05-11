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

  if (!listing?.id || !listing?.current_bid || !listing?.top_bid_id) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data: txId, error: rpcError } = await supabase.rpc('accept_bid', {
        p_listing_id: listing.id,
        p_bid_id: listing.top_bid_id,
      })

      if (rpcError) throw rpcError

      toast.success('Bid accepted! The auction has ended and a transaction has been created.');
      onAccepted?.(txId);
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