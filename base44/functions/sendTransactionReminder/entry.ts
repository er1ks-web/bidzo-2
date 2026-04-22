import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled every hour.
// Sends reminder emails to unconfirmed parties after 24h.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

    const pending = await base44.asServiceRole.entities.AuctionTransaction.filter(
      { status: 'sold_pending' },
      '-created_date',
      100
    );

    let sent = 0;
    for (const tx of pending) {
      const created = new Date(tx.created_date);
      if (created > cutoff) continue; // less than 24h old, skip
      if (tx.reminder_sent_at) continue; // already reminded

      // Send reminders to unconfirmed parties
      if (!tx.buyer_confirmed) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: tx.buyer_email,
          subject: `⏰ Reminder: Confirm your purchase — ${tx.listing_title}`,
          body: `Hi ${tx.buyer_name},\n\nYou won "${tx.listing_title}" for €${tx.winning_amount?.toFixed(2)} but haven't confirmed your purchase yet.\n\nPlease visit your Transactions page to confirm: https://bidzo.app/transactions\n\n— Bidzo Team`,
        });
      }

      if (!tx.seller_confirmed) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: tx.seller_email,
          subject: `⏰ Reminder: Confirm your sale — ${tx.listing_title}`,
          body: `Hi ${tx.seller_name},\n\nYour auction for "${tx.listing_title}" ended (€${tx.winning_amount?.toFixed(2)}) but you haven't confirmed the sale yet.\n\nPlease visit your Transactions page to confirm: https://bidzo.app/transactions\n\n— Bidzo Team`,
        });
      }

      await base44.asServiceRole.entities.AuctionTransaction.update(tx.id, {
        reminder_sent_at: now.toISOString(),
      });
      sent++;
    }

    return Response.json({ ok: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});