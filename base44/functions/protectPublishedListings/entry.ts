import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Middleware function to prevent editing of published listings.
 * Call this at the start of any listing update operation.
 */
export async function checkListingPublished(base44, listingId) {
  const listings = await base44.entities.Listing.filter({ id: listingId });
  if (!listings.length) {
    return { error: 'Listing not found', status: 404 };
  }

  const listing = listings[0];
  if (listing.published) {
    return {
      error: 'Published listings cannot be edited. Contact support if you need changes.',
      status: 422,
    };
  }

  return { listing };
}

/**
 * Example: Prevent direct listing updates via the SDK
 * This is called by the platform to validate any update request.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id, data } = await req.json();

    if (!listing_id) {
      return Response.json({ error: 'listing_id required' }, { status: 400 });
    }

    const check = await checkListingPublished(base44, listing_id);
    if (check.error) {
      return Response.json({ error: check.error }, { status: check.status });
    }

    const listing = check.listing;

    // Verify ownership
    if (listing.seller_email !== user.email) {
      return Response.json({ error: 'You can only edit your own listings' }, { status: 403 });
    }

    // Allow the update (this is just validation, actual update happens in frontend)
    return Response.json({ success: true, listing_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});