import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Bid validation rules — must mirror lib/bidRules.js exactly.
 * Inlined here because backend functions cannot import local files.
 */
function getMinIncrement(currentBid) {
  if (currentBid < 50)   return 1;
  if (currentBid < 200)  return 2;
  if (currentBid < 1000) return 5;
  return 10;
}

function getMinNextBid(currentBid) {
  return currentBid + getMinIncrement(currentBid);
}

function getMaxBid(currentBid) {
  if (currentBid < 50)   return currentBid + 100;
  if (currentBid < 200)  return currentBid + 300;
  if (currentBid < 1000) return currentBid + 1000;
  return currentBid + currentBid * 0.5;
}

function validateBid(amount, currentBid) {
  const min = getMinNextBid(currentBid);
  const max = getMaxBid(currentBid);

  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Please enter a valid bid amount.' };
  }
  if (amount < min) {
    return { valid: false, error: `Your bid is too low. Minimum allowed bid is €${min.toFixed(2)}.` };
  }
  if (amount > max) {
    return { valid: false, error: `Your bid is too high. Maximum allowed bid is €${max.toFixed(2)}.` };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id, amount } = await req.json();

    if (!listing_id || amount == null) {
      return Response.json({ error: 'Missing listing_id or amount.' }, { status: 400 });
    }

    // Check buyer eligibility (restrictions, limits)
    const trustRecords = await base44.entities.BuyerTrust.filter({ user_email: user.email });
    const buyerTrust = trustRecords[0];

    if (buyerTrust?.restriction_type === 'permanent') {
      return Response.json({ error: 'Your account has been permanently restricted from bidding.' }, { status: 403 });
    }

    if (buyerTrust?.restriction_type === 'temporary') {
      const endDate = new Date(buyerTrust.restriction_end_date);
      if (endDate > new Date()) {
        return Response.json({ error: 'Your bidding is temporarily restricted.' }, { status: 403 });
      }
    }

    // Check bid limits for new users (account age < 30 days)
    const accountAge = Date.now() - new Date(user.created_date).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const isNewUser = accountAge < thirtyDaysMs;

    if (isNewUser) {
      const activeBids = await base44.entities.Bid.filter({ bidder_email: user.email });
      // Count only unique listings (re-bidding on the same listing after being outbid shouldn't count extra)
      const uniqueListings = new Set(activeBids.map(b => b.listing_id));
      // Don't count the current listing if the user has already bid on it
      uniqueListings.delete(listing_id);
      if (uniqueListings.size >= 5) {
        return Response.json({ error: 'New users can have maximum 5 active bids.' }, { status: 403 });
      }

      const pendingTransactions = await base44.entities.AuctionTransaction.filter({
        buyer_email: user.email
      });
      const pending = pendingTransactions.filter(t => ['sold_pending', 'buyer_confirmed', 'seller_confirmed'].includes(t.status));
      if (pending.length >= 5) {
        return Response.json({ error: 'New users can have maximum 5 pending transactions.' }, { status: 403 });
      }
    }

    // Fetch the latest listing state from the DB (prevents race conditions)
    const listings = await base44.asServiceRole.entities.Listing.filter({ id: listing_id });
    const listing = listings[0];

    if (!listing) {
      return Response.json({ error: 'Listing not found.' }, { status: 404 });
    }
    if (listing.listing_type !== 'auction') {
      return Response.json({ error: 'This listing is not an auction.' }, { status: 400 });
    }
    if (listing.status !== 'active') {
      return Response.json({ error: 'This auction is no longer active.' }, { status: 400 });
    }
    if (listing.auction_end && new Date(listing.auction_end) < new Date()) {
      return Response.json({ error: 'This auction has ended.' }, { status: 400 });
    }
    if (listing.seller_email === user.email) {
      return Response.json({ error: 'You cannot bid on your own listing.' }, { status: 400 });
    }

    const currentBid = listing.current_bid ?? listing.price ?? 0;
    const numericAmount = parseFloat(amount);

    // Server-side bid validation
    const result = validateBid(numericAmount, currentBid);
    if (!result.valid) {
      return Response.json({ error: result.error }, { status: 422 });
    }

    // Create bid record
    await base44.asServiceRole.entities.Bid.create({
      listing_id,
      bidder_email: user.email,
      bidder_name: user.full_name,
      amount: numericAmount,
    });

    // Update listing
    const updateData = {
      current_bid: numericAmount,
      bid_count: (listing.bid_count || 0) + 1,
      highest_bidder: user.email,
      highest_bidder_name: user.full_name,
    };

    // Anti-sniping: extend by 5 min if bid placed in last 5 min
    const timeLeft = new Date(listing.auction_end) - new Date();
    if (timeLeft > 0 && timeLeft < 5 * 60 * 1000) {
      updateData.auction_end = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    }

    await base44.asServiceRole.entities.Listing.update(listing_id, updateData);

    // Notify the outbid user (if there was a previous highest bidder)
    if (listing.highest_bidder && listing.highest_bidder !== user.email) {
      const outbidUserEmail = listing.highest_bidder;
      const systemConvId = `system_${outbidUserEmail}`;
      await base44.asServiceRole.entities.Message.create({
        conversation_id: systemConvId,
        listing_id,
        sender_email: 'system@bidzo.app',
        sender_name: 'Bidzo Team',
        recipient_email: outbidUserEmail,
        content: `⚠️ You've been outbid on "${listing.title}"! Someone placed a higher bid of €${numericAmount.toFixed(2)}. Visit the listing to place a new bid before the auction ends.`,
        read: false,
      });
      // Send outbid email
      await base44.asServiceRole.functions.invoke('sendEmailNotification', {
        type: 'outbid',
        to: outbidUserEmail,
        data: {
          listing_title: listing.title,
          listing_id,
          new_bid: numericAmount,
        },
      });
    }

    return Response.json({
      ok: true,
      extended: !!updateData.auction_end,
      new_bid: numericAmount,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});