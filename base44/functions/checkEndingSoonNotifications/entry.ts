import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled function: runs every 5 minutes
// Finds auctions ending within 10 minutes and triggers ending-soon emails for watchers

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const in10min = new Date(now.getTime() + 10 * 60 * 1000);

    // Fetch all active auctions
    const listings = await base44.asServiceRole.entities.Listing.filter({ status: 'active', listing_type: 'auction' }, 'auction_end', 200);

    let triggered = 0;
    for (const listing of listings) {
      if (!listing.auction_end) continue;
      const end = new Date(listing.auction_end);
      if (end > now && end <= in10min) {
        // Find watchers who haven't been notified yet
        const watchers = await base44.asServiceRole.entities.Watchlist.filter({
          listing_id: listing.id,
          ending_soon_notified: false,
          notify_ending_soon: true,
        });
        if (!watchers.length) continue;

        // Invoke the notification function for each
        await base44.asServiceRole.functions.invoke('sendWatchlistNotification', {
          type: 'ending_soon',
          listing_id: listing.id,
        });
        triggered++;
      }
    }

    return Response.json({ ok: true, triggered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});