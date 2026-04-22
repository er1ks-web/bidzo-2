import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Entity automation: fires when a new Bid is created
// Sends "new bid" emails to all watchers of that listing

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const bid = payload.data;
    if (!bid || !bid.listing_id) return Response.json({ ok: true, skipped: 'no bid data' });

    await base44.asServiceRole.functions.invoke('sendWatchlistNotification', {
      type: 'new_bid',
      listing_id: bid.listing_id,
      new_bid_amount: bid.amount,
      new_bid_id: bid.id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});