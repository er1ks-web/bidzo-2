import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled every 5 minutes.
// Finds active auctions whose timer has expired, closes them, creates AuctionTransaction records, and sends emails.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Fetch all still-active auctions
    const listings = await base44.asServiceRole.entities.Listing.filter(
      { status: 'active', listing_type: 'auction' },
      'auction_end',
      200
    );

    let resolved = 0;
    let noWinner = 0;

    for (const listing of listings) {
      if (!listing.auction_end) continue;
      const end = new Date(listing.auction_end);
      if (end > now) continue; // not over yet

      if (listing.highest_bidder && listing.current_bid) {
        // --- Auction ended WITH winner ---
        const winningAmount = listing.current_bid;
        const buyerEmail = listing.highest_bidder;
        const buyerName = listing.highest_bidder_name || buyerEmail.split('@')[0];
        const sellerEmail = listing.seller_email;
        const sellerName = listing.seller_name || sellerEmail.split('@')[0];
        const convId = [buyerEmail, sellerEmail].sort().join('_');

        // 1. Update listing status
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          status: 'sold_pending',
        });

        // 2. Create AuctionTransaction record
        await base44.asServiceRole.entities.AuctionTransaction.create({
          listing_id: listing.id,
          listing_title: listing.title,
          listing_image: listing.images?.[0] || '',
          seller_email: sellerEmail,
          seller_name: sellerName,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          winning_amount: winningAmount,
          status: 'sold_pending',
          buyer_confirmed: false,
          seller_confirmed: false,
          conversation_id: convId,
        });

        // 3. System notification messages (personal inbox) for buyer and seller
        const buyerSystemConvId = `system_${buyerEmail}`;
        const sellerSystemConvId = `system_${sellerEmail}`;

        await base44.asServiceRole.entities.Message.create({
          conversation_id: buyerSystemConvId,
          listing_id: listing.id,
          sender_email: 'system@bidzo.app',
          sender_name: 'Bidzo Team',
          recipient_email: buyerEmail,
          content: `🎉 Congratulations! You won the auction for "${listing.title}" with a winning bid of €${winningAmount.toFixed(2)}! To complete your purchase, please go to your Transactions page and confirm the deal.`,
          read: false,
        });

        await base44.asServiceRole.entities.Message.create({
          conversation_id: sellerSystemConvId,
          listing_id: listing.id,
          sender_email: 'system@bidzo.app',
          sender_name: 'Bidzo Team',
          recipient_email: sellerEmail,
          content: `Your auction for "${listing.title}" has ended! The winner is ${buyerName} with a bid of €${winningAmount.toFixed(2)}. Please go to your Transactions page to confirm the sale and proceed.`,
          read: false,
        });

        // 4. Also auto-create initial message thread between buyer and seller
        await base44.asServiceRole.entities.Message.create({
          conversation_id: convId,
          listing_id: listing.id,
          sender_email: 'system@bidzo.app',
          sender_name: 'Bidzo Team',
          recipient_email: buyerEmail,
          content: `🎉 Congratulations! You won the auction for "${listing.title}" with a bid of €${winningAmount.toFixed(2)}. Use this chat to coordinate with the seller.`,
          read: false,
        });

        await base44.asServiceRole.entities.Message.create({
          conversation_id: convId,
          listing_id: listing.id,
          sender_email: 'system@bidzo.app',
          sender_name: 'Bidzo Team',
          recipient_email: sellerEmail,
          content: `Your auction "${listing.title}" has ended! The winner is ${buyerName} with a bid of €${winningAmount.toFixed(2)}. Use this chat to coordinate the transaction.`,
          read: false,
        });

        // 4. Send emails via shared notification function (respects user prefs)
        await base44.asServiceRole.functions.invoke('sendEmailNotification', {
          type: 'auction_won',
          to: buyerEmail,
          data: { listing_title: listing.title, winning_amount: winningAmount },
        });

        await base44.asServiceRole.functions.invoke('sendEmailNotification', {
          type: 'auction_ended',
          to: sellerEmail,
          data: { listing_title: listing.title, buyer_name: buyerName, winning_amount: winningAmount },
        });

        // Transaction chat created email for both parties
        await base44.asServiceRole.functions.invoke('sendEmailNotification', {
          type: 'transaction_chat',
          to: buyerEmail,
          data: { listing_title: listing.title, other_party: sellerName },
        });

        await base44.asServiceRole.functions.invoke('sendEmailNotification', {
          type: 'transaction_chat',
          to: sellerEmail,
          data: { listing_title: listing.title, other_party: buyerName },
        });

        resolved++;
      } else {
        // --- Auction ended with NO bids ---
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          status: 'expired_no_winner',
        });
        noWinner++;
      }
    }

    return Response.json({ ok: true, resolved, noWinner });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});