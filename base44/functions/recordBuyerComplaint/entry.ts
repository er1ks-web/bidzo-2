import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { buyer_email, transaction_id, outcome } = await req.json();

    if (!buyer_email || !outcome) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create buyer trust record
    let buyerTrustRecords = await base44.asServiceRole.entities.BuyerTrust.filter({ user_email: buyer_email });
    let buyerTrust = buyerTrustRecords[0];

    if (!buyerTrust) {
      buyerTrust = await base44.asServiceRole.entities.BuyerTrust.create({
        user_email: buyer_email,
        strike_count: 0,
        restriction_type: 'none'
      });
    }

    // Update failed transactions list
    const failedTransactions = buyerTrust.failed_transactions || [];
    if (!failedTransactions.includes(transaction_id)) {
      failedTransactions.push(transaction_id);
    }

    // Increment strike count and apply restrictions
    const newStrikeCount = (buyerTrust.strike_count || 0) + 1;
    let restrictionType = 'none';
    let restrictionDays = 0;
    let restrictionEndDate = null;

    if (newStrikeCount === 2) {
      // Second strike: 7-day restriction
      restrictionType = 'temporary';
      restrictionDays = 7;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      restrictionEndDate = endDate.toISOString();
    } else if (newStrikeCount >= 3) {
      // Third strike: 30-day suspension
      restrictionType = 'temporary';
      restrictionDays = 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      restrictionEndDate = endDate.toISOString();
    }

    // Update buyer trust record
    await base44.asServiceRole.entities.BuyerTrust.update(buyerTrust.id, {
      strike_count: newStrikeCount,
      restriction_type: restrictionType,
      restriction_days: restrictionDays,
      restriction_end_date: restrictionEndDate,
      failed_transactions: failedTransactions,
      last_strike_reason: `${outcome} on auction ${transaction_id}`
    });

    return Response.json({
      success: true,
      strikeCount: newStrikeCount,
      restrictionType: restrictionType,
      message: newStrikeCount === 1 
        ? 'Warning recorded'
        : newStrikeCount === 2
        ? 'Account restricted for 7 days'
        : 'Account restricted for 30 days'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});