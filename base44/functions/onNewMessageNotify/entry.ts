import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Entity automation: fires when a new Message is created.
// Sends email notification to recipient for user-to-user messages only.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const msg = payload.data;

    if (!msg) return Response.json({ ok: true, skipped: 'no data' });

    // Skip system messages
    if (msg.sender_email === 'system@bidzo.app') {
      return Response.json({ ok: true, skipped: 'system_message' });
    }

    // Skip if no recipient
    if (!msg.recipient_email) return Response.json({ ok: true, skipped: 'no_recipient' });

    // Resolve sender display name from UserProfile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: msg.sender_email });
    const senderName = profiles[0]?.username || msg.sender_name || msg.sender_email.split('@')[0];

    await base44.asServiceRole.functions.invoke('sendEmailNotification', {
      type: 'new_message',
      to: msg.recipient_email,
      data: {
        sender_name: senderName,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});