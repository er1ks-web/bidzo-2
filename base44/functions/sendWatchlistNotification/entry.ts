import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { type, listing_id, new_bid_amount, new_bid_id } = await req.json();

    // Fetch listing
    const listings = await base44.asServiceRole.entities.Listing.filter({ id: listing_id });
    const listing = listings[0];
    if (!listing) return Response.json({ ok: false, reason: 'listing not found' });

    const listingUrl = `${req.headers.get('origin') || 'https://bidzo.base44.app'}/listing/${listing_id}`;

    // Fetch all watchers for this listing
    const watchers = await base44.asServiceRole.entities.Watchlist.filter({ listing_id });
    if (!watchers.length) return Response.json({ ok: true, sent: 0 });

    let sent = 0;

    for (const watch of watchers) {
      // Skip the person who placed the bid (don't notify yourself)
      if (type === 'new_bid') {
        if (!watch.notify_new_bid) continue;
        // Debounce: skip if we already notified for this exact bid
        if (watch.last_notified_bid === new_bid_id) continue;

        const currentBid = listing.current_bid || listing.price;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: watch.user_email,
          subject: `New bid on "${listing.title}"`,
          body: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 8px;">New bid placed 🔨</h2>
              <p style="color:#555;">A new bid of <strong>€${currentBid?.toFixed(2)}</strong> was placed on an item you're watching.</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:600;font-size:18px;">${listing.title}</p>
                <p style="margin:4px 0 0;color:#888;font-size:14px;">Current bid: €${currentBid?.toFixed(2)} · ${listing.bid_count || 0} bid(s)</p>
              </div>
              <a href="${listingUrl}" style="display:inline-block;background:#f5c200;color:#111;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">View &amp; Bid →</a>
              <p style="color:#aaa;font-size:12px;margin-top:24px;">You're receiving this because you're watching this item on Bidzo. <a href="${listingUrl}">Manage</a></p>
            </div>
          `,
        });

        await base44.asServiceRole.entities.Watchlist.update(watch.id, { last_notified_bid: new_bid_id });
        sent++;
      }

      if (type === 'ending_soon') {
        if (!watch.notify_ending_soon) continue;
        if (watch.ending_soon_notified) continue;

        const msLeft = new Date(listing.auction_end) - new Date();
        const minsLeft = Math.max(0, Math.round(msLeft / 60000));

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: watch.user_email,
          subject: `⏰ Ending in ~${minsLeft} min: "${listing.title}"`,
          body: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 8px;color:#d97706;">Ending soon! ⏰</h2>
              <p style="color:#555;">An item you're watching ends in approximately <strong>${minsLeft} minute${minsLeft !== 1 ? 's' : ''}</strong>.</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:600;font-size:18px;">${listing.title}</p>
                <p style="margin:4px 0 0;color:#888;font-size:14px;">Current bid: €${(listing.current_bid || listing.price)?.toFixed(2)} · ${listing.bid_count || 0} bid(s)</p>
              </div>
              <a href="${listingUrl}" style="display:inline-block;background:#f5c200;color:#111;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">Bid Now →</a>
              <p style="color:#aaa;font-size:12px;margin-top:24px;">You're watching this item on Bidzo.</p>
            </div>
          `,
        });

        await base44.asServiceRole.entities.Watchlist.update(watch.id, { ending_soon_notified: true });
        sent++;
      }

      if (type === 'auction_ended') {
        if (!watch.notify_auction_ended) continue;

        const winner = listing.highest_bidder_name || 'another user';
        const finalPrice = listing.current_bid || listing.price;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: watch.user_email,
          subject: `Auction ended: "${listing.title}"`,
          body: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 8px;">Auction ended 🏁</h2>
              <p style="color:#555;">An auction you were watching has ended.</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:600;font-size:18px;">${listing.title}</p>
                <p style="margin:4px 0 0;color:#888;font-size:14px;">Final price: €${finalPrice?.toFixed(2)}</p>
              </div>
              <a href="${listingUrl}" style="display:inline-block;background:#111;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">View Result →</a>
              <p style="color:#aaa;font-size:12px;margin-top:24px;">You watched this item on Bidzo.</p>
            </div>
          `,
        });
        sent++;
      }
    }

    return Response.json({ ok: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});