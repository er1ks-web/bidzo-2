import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Shared email notification helper.
// Called by other backend functions to send typed emails, respecting user prefs.
//
// Payload:
//   type: 'outbid' | 'auction_won' | 'auction_ended' | 'transaction_chat' | 'new_message'
//   to: string (recipient email)
//   data: object (fields depend on type — see below)

const BASE_URL = 'https://bidzo.app';

function emailTemplate({ headline, body, ctaText, ctaUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:26px;font-weight:800;color:#F5C518;letter-spacing:-0.5px;">Bidzo</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#1A1A1A;border-radius:16px;padding:36px 32px;border:1px solid #2A2A2A;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3;">${headline}</h1>
              <div style="font-size:15px;color:#8A8A8A;line-height:1.6;margin-bottom:28px;">${body}</div>
              <a href="${ctaUrl}" style="display:inline-block;background:#F5C518;color:#111111;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;text-decoration:none;">${ctaText}</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-size:12px;color:#444444;margin:0;">You're receiving this because you have an account on Bidzo.</p>
              <p style="font-size:12px;color:#444444;margin:4px 0 0;">Manage your email preferences in <a href="${BASE_URL}/profile" style="color:#F5C518;text-decoration:none;">Profile → Settings</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function buildEmail(type, data) {
  switch (type) {
    case 'outbid':
      return {
        subject: `You've been outbid on "${data.listing_title}"`,
        html: emailTemplate({
          headline: "You've been outbid! ⚡",
          body: `Someone placed a higher bid of <strong style="color:#FFFFFF;">€${data.new_bid.toFixed(2)}</strong> on <strong style="color:#FFFFFF;">${data.listing_title}</strong>.<br/><br/>Place a new bid before the auction ends!`,
          ctaText: 'Bid Again →',
          ctaUrl: `${BASE_URL}/listing/${data.listing_id}`,
        }),
      };

    case 'auction_won':
      return {
        subject: `🎉 You won: ${data.listing_title}`,
        html: emailTemplate({
          headline: '🎉 Congratulations, you won!',
          body: `Your winning bid of <strong style="color:#FFFFFF;">€${data.winning_amount.toFixed(2)}</strong> secured <strong style="color:#FFFFFF;">${data.listing_title}</strong>.<br/><br/>Go to your Transactions page and confirm the purchase to move forward.`,
          ctaText: 'Confirm Purchase →',
          ctaUrl: `${BASE_URL}/transactions`,
        }),
      };

    case 'auction_ended':
      return {
        subject: `Your auction ended: ${data.listing_title}`,
        html: emailTemplate({
          headline: 'Your auction has ended!',
          body: `<strong style="color:#FFFFFF;">${data.listing_title}</strong> sold to <strong style="color:#FFFFFF;">${data.buyer_name}</strong> for <strong style="color:#FFFFFF;">€${data.winning_amount.toFixed(2)}</strong>.<br/><br/>Confirm the sale on your Transactions page to proceed.`,
          ctaText: 'Confirm Sale →',
          ctaUrl: `${BASE_URL}/transactions`,
        }),
      };

    case 'transaction_chat':
      return {
        subject: `Transaction chat ready: ${data.listing_title}`,
        html: emailTemplate({
          headline: 'Your transaction chat is ready 💬',
          body: `The auction for <strong style="color:#FFFFFF;">${data.listing_title}</strong> has ended and your transaction thread with <strong style="color:#FFFFFF;">${data.other_party}</strong> is now open.<br/><br/>Use it to coordinate the deal.`,
          ctaText: 'Open Messages →',
          ctaUrl: `${BASE_URL}/messages`,
        }),
      };

    case 'new_message':
      return {
        subject: `${data.sender_name} sent you a message`,
        html: emailTemplate({
          headline: 'You have a new message 📩',
          body: `<strong style="color:#FFFFFF;">${data.sender_name}</strong> sent you a message on Bidzo.<br/><br/>Open the app to read and reply.`,
          ctaText: 'View Message →',
          ctaUrl: `${BASE_URL}/messages`,
        }),
      };

    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { type, to, data } = await req.json();

    if (!type || !to) {
      return Response.json({ error: 'Missing type or to' }, { status: 400 });
    }

    // Check user notification preferences (default all true if no record)
    const prefsRecords = await base44.asServiceRole.entities.NotificationPrefs.filter({ user_email: to });
    const prefs = prefsRecords[0];

    // If a prefs record exists and this type is explicitly false, skip
    if (prefs && prefs[type] === false) {
      return Response.json({ ok: true, skipped: 'user_preference' });
    }

    const email = buildEmail(type, data);
    if (!email) {
      return Response.json({ error: 'Unknown email type' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject: email.subject,
      body: email.html,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});