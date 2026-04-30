import { useState, useEffect } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gavel, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getMinIncrement, getMinNextBid, getMaxBid, validateBid } from '@/lib/bidRules';
import { motion, AnimatePresence } from 'framer-motion';
import FirstBidWarningModal from './FirstBidWarningModal';
import BidRestrictionAlert from './BidRestrictionAlert';
import BidSuccessSheet from './BidSuccessSheet';

export default function BidPanel({ listing, user, onBidPlaced }) {
  const { requireLogin } = useAuth();
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showFirstBidWarning, setShowFirstBidWarning] = useState(false);
  const [buyerTrust, setBuyerTrust] = useState(null);
  const [bidCheckMessage, setBidCheckMessage] = useState('');
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);

  useEffect(() => {
    if (!user) return;
    ;(async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) console.log(authError)
        const authUser = authData?.user
        if (!authUser?.id) return

        const { data, error } = await supabase
          .from('buyer_trust')
          .select('*')
          .eq('user_id', authUser.id)
          .limit(1)

        if (error) console.log(error)
        const record = Array.isArray(data) ? (data[0] || null) : null
        setBuyerTrust(record)
      } catch (e) {
        console.log(e)
      }
    })()
  }, [user]);

  const currentBid = listing.current_bid ?? listing.price;
  const minNext = getMinNextBid(currentBid);
  const maxAllowed = getMaxBid(currentBid);

  const handleChange = (e) => {
    const val = e.target.value;
    setBidAmount(val);
    if (val) {
      const result = validateBid(parseFloat(val), currentBid);
      setValidationError(result.valid ? '' : result.error);
    } else {
      setValidationError('');
    }
  };

  const handleSubmit = async ({ skipFirstBidCheck = false } = {}) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) console.log(userError)
    const authUser = userData?.user

    if (!authUser) {
      requireLogin('Log in to place a bid');
      return;
    }

    const amount = parseFloat(bidAmount);
    const result = validateBid(amount, currentBid);
    if (!result.valid) {
      setValidationError(result.error);
      return;
    }

    // Check if first bid and show warning
    if (!skipFirstBidCheck && !buyerTrust?.first_bid_acknowledged) {
      setShowFirstBidWarning(true);
      return;
    }

    // Check restriction status
    if (buyerTrust?.restriction_type === 'permanent') {
      toast.error('Your account has been permanently restricted from bidding.');
      return;
    }

    if (buyerTrust?.restriction_type === 'temporary') {
      const endDate = new Date(buyerTrust.restriction_end_date);
      if (endDate > new Date()) {
        toast.error('Your bidding is temporarily restricted.');
        return;
      }
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      const { error: rpcError } = await supabase.rpc('place_bid', {
        p_listing_id: listing.id,
        p_amount: amount,
      })

      if (rpcError) {
        console.log(rpcError)
        setValidationError(rpcError.message || 'Failed to place bid')
        setIsSubmitting(false)
        return
      }

      toast.success('Bid placed successfully!');
      setBidAmount('');
      setIsSubmitting(false);
      setShowSuccessSheet(true);
      onBidPlaced?.();
    } catch (err) {
      console.log(err)
      const errorMsg = err.response?.data?.error || err.message || 'Failed to place bid';
      setValidationError(errorMsg);
      setIsSubmitting(false);
    }
  };

  const handleFirstBidConfirm = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) console.log(authError)
    const authUser = authData?.user
    if (!authUser?.id) return

    try {
      if (!buyerTrust) {
        const { data, error } = await supabase
          .from('buyer_trust')
          .insert({
            user_id: authUser.id,
            first_bid_acknowledged: true,
          })
          .select('*')

        if (error) console.log(error)
        const record = Array.isArray(data) ? (data[0] || null) : null
        if (record) setBuyerTrust(record)
      } else {
        const { data, error } = await supabase
          .from('buyer_trust')
          .update({ first_bid_acknowledged: true })
          .eq('id', buyerTrust.id)
          .select('*')

        if (error) console.log(error)
        const record = Array.isArray(data) ? (data[0] || null) : null
        if (record) setBuyerTrust(record)
        else setBuyerTrust({ ...buyerTrust, first_bid_acknowledged: true })
      }
    } catch (e) {
      console.log(e)
      setBuyerTrust((prev) => (prev ? { ...prev, first_bid_acknowledged: true } : prev))
    }

    setShowFirstBidWarning(false);
    // Re-submit the bid without re-triggering the first-bid modal (avoids stale state loop)
    await handleSubmit({ skipFirstBidCheck: true });
  };

  return (
    <>
      <BidRestrictionAlert
        restrictionType={buyerTrust?.restriction_type}
        restrictionEndDate={buyerTrust?.restriction_end_date}
        strikeCount={buyerTrust?.strike_count}
      />

      <div className="bg-card rounded-xl border p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm">Place a Bid</span>
        </div>

      {/* Info row */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-muted rounded-lg p-2.5">
          <p className="text-muted-foreground mb-0.5">Min next bid</p>
          <p className="font-bold text-foreground">€{minNext.toFixed(2)}</p>
        </div>
        <div className="bg-muted rounded-lg p-2.5">
          <p className="text-muted-foreground mb-0.5">Max allowed</p>
          <p className="font-bold text-foreground">€{maxAllowed.toFixed(2)}</p>
        </div>
      </div>

      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
        <Input
          type="number"
          step="0.01"
          min={minNext}
          max={maxAllowed}
          value={bidAmount}
          onChange={handleChange}
          placeholder={minNext.toFixed(2)}
          className="pl-7"
        />
      </div>

      {/* Quick-bid button */}
      <button
        type="button"
        onClick={() => {
          setBidAmount(minNext.toFixed(2));
          setValidationError('');
        }}
        className="text-xs text-accent hover:underline flex items-center gap-1"
      >
        <TrendingUp className="w-3 h-3" />
        Use minimum bid (€{minNext.toFixed(2)})
      </button>

      {/* Validation error */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2"
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !!validationError || !bidAmount}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2"
      >
        <Gavel className="w-4 h-4" />
        {isSubmitting ? 'Placing bid...' : 'Place Bid'}
      </Button>
      </div>

      <FirstBidWarningModal
        isOpen={showFirstBidWarning}
        onConfirm={handleFirstBidConfirm}
        onCancel={() => setShowFirstBidWarning(false)}
      />

      <BidSuccessSheet
        isOpen={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        auctionEnd={listing.auction_end}
      />
    </>
  );
}