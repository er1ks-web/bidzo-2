import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase'
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Eye, User, Star, MessageSquare, Flag, Gavel, Tag, ArrowLeft, ShoppingCart, Trophy, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import ImageGallery from '@/components/listings/ImageGallery';
import AuctionTimer from '@/components/listings/AuctionTimer';
import BidPanel from '@/components/listings/BidPanel.jsx';
import BuyNowPanel from '@/components/listings/BuyNowPanel';
import BidHistory from '@/components/listings/BidHistory';
import WatchButton from '@/components/listings/WatchButton';
import ShareButton from '@/components/listings/ShareButton';
import AcceptBidButton from '@/components/listings/AcceptBidButton';
import ReportModal from '@/components/listings/ReportModal';
import DeleteListingModal from '@/components/listings/DeleteListingModal';
import StarRatingDisplay from '@/components/reviews/StarRatingDisplay';
import { useUserRating } from '@/lib/useUserRating';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const LOCATION_NAMES = {
  riga: 'Rīga', daugavpils: 'Daugavpils', liepaja: 'Liepāja',
  jelgava: 'Jelgava', jurmala: 'Jūrmala', ventspils: 'Ventspils',
  rezekne: 'Rēzekne', valmiera: 'Valmiera', jekabpils: 'Jēkabpils',
  ogre: 'Ogre', tukums: 'Tukums', cesis: 'Cēsis', other: 'Cita',
};

export default function ListingDetail() {
  const { t } = useI18n();
  const { user, requireLogin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const urlParts = window.location.pathname.split('/');
  const listingId = urlParts[urlParts.length - 1];
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(listingId || ''));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingListing, setDeletingListing] = useState(false);



  // View tracking — once per listing per 24h per browser
  useEffect(() => {
    if (!listingId || !isValidUuid) return;
    const key = `viewed_${listingId}`;
    const last = localStorage.getItem(key);
    const now = Date.now();
    if (last && now - parseInt(last) < 24 * 60 * 60 * 1000) return;
    localStorage.setItem(key, String(now));
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)

        if (error) console.log(error)

        if (Array.isArray(data) && data[0]) {
          const current = data[0]
          const { error: updateError } = await supabase
            .from('listings')
            .update({ views: (current.views || 0) + 1 })
            .eq('id', listingId)

          if (updateError) console.log(updateError)
          // Refresh the listing query so the new view count displays
          queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [listingId]);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)

      if (error) console.log(error)

      return Array.isArray(data) ? (data[0] || null) : null;
    },
    enabled: !!listingId && isValidUuid,
  });

  const { data: bids = [] } = useQuery({
    queryKey: ['bids', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('listing_id', listingId)
        .order('amount', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) console.log(error)
      const rows = Array.isArray(data) ? data : []

      try {
        const bidderIds = Array.from(new Set(rows.map(r => r?.bidder_id).filter(Boolean)))
        if (!bidderIds.length) return rows

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', bidderIds)

        if (profilesError) console.log(profilesError)

        const byId = new Map((Array.isArray(profiles) ? profiles : []).map(p => [p.id, p]))
        return rows.map((b) => {
          const p = byId.get(b.bidder_id)
          const display = p?.username || (p?.email ? p.email.split('@')[0] : null)
          return {
            ...b,
            bidder_name: display || b.bidder_name,
            bidder_username: display,
          }
        })
      } catch (e) {
        console.log(e)
        return rows
      }
    },
    enabled: !!listingId && isValidUuid,
  });

  // Real-time updates for listing and bids
  useEffect(() => {
    if (!listingId || !isValidUuid) return;
    const listingChannel = supabase
      .channel(`listing-${listingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${listingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.log('listing channel error')
      });

    const bidsChannel = supabase
      .channel(`bids-${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `listing_id=eq.${listingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bids', listingId] });
          queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.log('bids channel error')
      });

    return () => {
      supabase.removeChannel(listingChannel)
      supabase.removeChannel(bidsChannel)
    };
  }, [listingId, isValidUuid, queryClient]);

  // Inject OG meta tags for social preview
  useEffect(() => {
    if (!listing) return;
    const price = listing.current_bid || listing.price;
    const description = `${listing.listing_type === 'auction' ? 'Auction' : 'Buy now'} · €${price?.toFixed(2)} · ${listing.description?.slice(0, 120) || ''}`;
    const image = listing.images?.[0] || '';

    const setMeta = (prop, content, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    document.title = `${listing.title} | Bidzo`;
    setMeta('og:title', listing.title);
    setMeta('og:description', description);
    setMeta('og:image', image);
    setMeta('og:url', window.location.href);
    setMeta('og:type', 'website');
    setMeta('description', description, 'name');

    return () => { document.title = 'Bidzo'; };
  }, [listing]);

  const isAuction = listing?.listing_type === 'auction';
  const isOwner = user?.id === listing?.seller_id;

  const { data: sellerProfile } = useQuery({
    queryKey: ['seller-profile', listing?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', listing.seller_id)

      if (error) console.log(error)
      return Array.isArray(data) ? (data[0] || null) : null
    },
    enabled: !!listing?.seller_id,
  });

  const sellerEmail = sellerProfile?.email || null
  const sellerName = listing?.seller_name || sellerProfile?.username || (sellerEmail ? sellerEmail.split('@')[0] : null)
  const { data: sellerRating } = useUserRating(listing?.seller_id || sellerProfile?.id || null);
  const hasEnded = isAuction && listing?.auction_end && new Date(listing.auction_end) < new Date();
  const isSoldPending = ['sold_pending', 'in_progress', 'completed'].includes(listing?.status);

  const topBid = Array.isArray(bids) ? (bids[0] || null) : null
  const highestBidderFallback = listing?.highest_bidder || topBid?.bidder_id || null
  const highestBidderNameFallback = listing?.highest_bidder_name || topBid?.bidder_name || null
  const currentBidFallback = listing?.current_bid || topBid?.amount || null

  const isEndedOrInDeal = !!(hasEnded || isSoldPending)
  const isWinner = !!(
    user?.id && highestBidderFallback && user.id === highestBidderFallback
  ) || !!(
    user?.email && highestBidderFallback && user.email === highestBidderFallback
  )

  const handleContact = () => {
    if (!user) {
      requireLogin('Log in to message the seller');
      return;
    }
    if (!sellerEmail) {
      toast.error('Seller email not available');
      return
    }
    const convId = [user.email, sellerEmail].sort().join('_');
    window.location.href = `/messages?conv=${convId}&listing=${listing.id}&to=${sellerEmail}&toName=${sellerName || ''}`;
  };

  const handleBuyNow = async () => {
    if (!user) {
      requireLogin('Log in to complete your purchase');
      return;
    }

    try {
      const now = new Date().toISOString()
      const buyerId = user?.id
      const sellerId = listing?.seller_id

      if (!buyerId || !sellerId) {
        toast.error('Missing buyer or seller info')
        return
      }

      // Prevent double purchases: verify latest listing state
      const { data: listingRows, error: listingReadError } = await supabase
        .from('listings')
        .select('id, status, is_sold, auction_end')
        .eq('id', listing.id)
        .limit(1)

      if (listingReadError) console.log(listingReadError)
      const latest = Array.isArray(listingRows) ? (listingRows[0] || null) : null
      const latestHasEnded = !!(latest?.auction_end && new Date(latest.auction_end) < new Date())
      const latestUnavailable = !latest || latest?.is_sold || latest?.status !== 'active' || latestHasEnded
      if (latestUnavailable) {
        toast.error('This listing is no longer available.')
        return
      }

      // If a transaction already exists for this listing, don't create another
      const { data: existingTx, error: existingTxError } = await supabase
        .from('auction_transactions')
        .select('id')
        .eq('listing_id', listing.id)
        .limit(1)

      if (existingTxError) console.log(existingTxError)
      if (Array.isArray(existingTx) && existingTx[0]) {
        toast.error('This listing has already been purchased.')
        return
      }

      const { data: sellerProfiles, error: sellerErr } = await supabase
        .from('profiles')
        .select('id, email, username, full_name')
        .eq('id', sellerId)
        .limit(1)

      if (sellerErr) console.log(sellerErr)
      const sellerProfile = Array.isArray(sellerProfiles) ? (sellerProfiles[0] || null) : null
      const sellerEmail = listing?.seller_email || sellerProfile?.email || null
      const sellerName = listing?.seller_name || sellerProfile?.username || sellerProfile?.full_name || (sellerEmail ? sellerEmail.split('@')[0] : null)

      // 1) Mark listing as sold_pending (awaiting confirmations)
      const { data: updatedListings, error: listingErr } = await supabase
        .from('listings')
        .update({
          status: 'sold_pending',
          is_sold: false,
          highest_bidder: user.email,
          highest_bidder_name: user.full_name,
          current_bid: listing.price,
          auction_end: now,
        })
        .eq('id', listing.id)
        .eq('status', 'active')
        .select('id, status')

      if (listingErr) {
        console.log(listingErr)
        toast.error('Could not complete purchase. Please try again.')
        return
      }

      if (!Array.isArray(updatedListings) || updatedListings.length === 0) {
        toast.error('This listing is no longer available.')
        return
      }

      // 2) Create deal record so it shows up in Deals/Transactions
      const { error: txErr } = await supabase
        .from('auction_transactions')
        .insert({
          listing_id: listing.id,
          seller_id: sellerId,
          buyer_id: buyerId,
          winning_amount: listing.price,
          status: 'sold_pending',
          buyer_confirmed: false,
          seller_confirmed: false,
        })

      if (txErr) {
        console.log(txErr)
        toast.error('Purchase created, but deal record failed. Please contact support.')
        return
      }

      toast.success('Purchase confirmed! Check your Transaction Room.')
      queryClient.setQueryData(['listing', listingId], (prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...prev,
          status: 'sold_pending',
          is_sold: false,
          highest_bidder: user.email,
          highest_bidder_name: user.full_name,
          current_bid: listing.price,
          auction_end: now,
        }
      })
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] })
    } catch (e) {
      console.log(e)
      toast.error('Something went wrong. Please try again.')
    }
  };

  const handleDeleteListing = async () => {
    setDeletingListing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_deleted: true })
        .eq('id', listing.id)
        .eq('seller_id', user?.id)

      if (error) {
        console.log(error)
        throw error
      }

      toast.success('Listing deleted');
      setTimeout(() => navigate('/profile'), 500);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete listing');
      console.error(err);
    } finally {
      setDeletingListing(false);
      setShowDeleteModal(false);
    }
  };



  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[4/3] rounded-xl bg-muted" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-12 w-1/3 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing || listing.is_deleted) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Listing not found or has been deleted</p>
        <Link to="/">
          <Button variant="outline" className="mt-4">← {t('nav.home')}</Button>
        </Link>
      </div>
    );
  }

  // Block any edit attempts on published listings
  if (listing.published && isOwner) {
    toast.error('Published listings cannot be edited.');
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Back button */}
      <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('nav.browse')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-8">
        {/* Left - Images */}
        <div className="lg:col-span-3">
          <ImageGallery images={listing.images} />
          
          {/* Description */}
          <div className="mt-4 sm:mt-6 bg-card rounded-xl border p-4 sm:p-6">
            <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{t('listing.description')}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p>
          </div>

          {/* Bid History for auctions */}
          {isAuction && (
            <div className="mt-4 sm:mt-6 bg-card rounded-xl border p-4 sm:p-6">
              <BidHistory bids={bids} currentUserEmail={user?.email} currentUserId={user?.id} />
            </div>
          )}
        </div>

        {/* Right - Details & Actions */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-5">
          {/* Title & badges */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn(
                  isAuction ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                )}>
                  {isAuction ? <Gavel className="w-3 h-3 mr-1" /> : <Tag className="w-3 h-3 mr-1" />}
                  {isAuction ? t('listing.auction') : t('listing.fixed')}
                </Badge>
                <Badge variant="outline">{t(`conditions.${listing.condition}`)}</Badge>
                <Badge variant="outline">{t(`categories.${listing.category}`)}</Badge>
              </div>
              {/* Share button — prominent, near the title */}
              <ShareButton listing={listing} className="shrink-0 h-8 text-xs px-3" />
            </div>
            <h1 className="text-xl sm:text-3xl font-display font-bold leading-tight">{listing.title}</h1>
          </div>

          {/* Price + Timer combined card */}
          <div className="bg-card rounded-xl border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">
                  {isAuction
                    ? ((listing.bid_count || 0) > 0 ? t('listing.currentBid') : t('listing.startingPrice'))
                    : t('listing.fixed')}
                </p>
                <p className="text-2xl sm:text-3xl font-display font-bold">
                  {t('common.eur')}{(isAuction ? (listing.current_bid || listing.price) : listing.price)?.toFixed(2)}
                </p>
                {isAuction && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {listing.bid_count || 0} {t('listing.bids')}
                  </p>
                )}
              </div>
              {isAuction && listing.auction_end && !hasEnded && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">{t('listing.timeLeft')}</p>
                  <AuctionTimer endDate={listing.auction_end} compact />
                </div>
              )}
            </div>
            {isAuction && listing.auction_end && !hasEnded && (
              <div className="mt-4 pt-4 border-t hidden sm:block">
                <AuctionTimer endDate={listing.auction_end} />
              </div>
            )}
          </div>

          {/* Post-auction banner */}
          {isEndedOrInDeal && (
            <div className={cn(
              'rounded-xl border p-4 space-y-3',
              listing.status === 'completed' ? 'bg-green-500/10 border-green-500/30' : 'bg-accent/10 border-accent/30'
            )}>
              <div className="flex items-center gap-2">
                {listing.status === 'completed'
                  ? <Trophy className="w-5 h-5 text-green-400" />
                  : <Clock className="w-5 h-5 text-accent" />}
                <p className="font-semibold text-sm">
                  {listing.status === 'completed' ? 'Deal Completed!' : 'Auction Ended — Deal in Progress'}
                </p>
              </div>
              {highestBidderNameFallback && (
                <p className="text-sm text-muted-foreground">
                  Winner: <span className="text-foreground font-medium">{highestBidderNameFallback}</span>
                  {' '}· €{(currentBidFallback != null ? currentBidFallback : listing.current_bid)?.toFixed(2)}
                </p>
              )}
              {(isWinner || isOwner) && listing.status !== 'completed' && (
                <RouterLink to="/deals">
                  <button className="w-full h-9 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors">
                    Go to Transaction Room →
                  </button>
                </RouterLink>
              )}
            </div>
          )}

          {/* Accept current bid — seller shortcut to end auction early */}
          {isOwner && listing.status === 'active' && isAuction && !hasEnded && currentBidFallback && highestBidderFallback && (
            <AcceptBidButton
              listing={{
                ...listing,
                current_bid: currentBidFallback,
                highest_bidder: highestBidderFallback,
                highest_bidder_name: highestBidderNameFallback,
              }}
              onAccepted={() => {
                queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
                queryClient.invalidateQueries({ queryKey: ['bids', listingId] });
              }}
            />
          )}

          {/* Locked notice for owner of published listing */}
          {isOwner && listing.published && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-destructive">Published listings cannot be edited</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This listing is locked and cannot be modified. If you need to make changes, please contact support.
                </p>
              </div>
            </div>
          )}

          {/* Bid panel / Buy now */}
          {listing.status === 'active' && !isOwner && (
            <>
              {isAuction && !hasEnded ? (
                <>
                  <BidPanel
                    listing={listing}
                    user={user}
                    onBidPlaced={() => {
                      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
                      queryClient.invalidateQueries({ queryKey: ['bids', listingId] });
                    }}
                  />
                  {listing.buy_now_price && (
                    <BuyNowPanel
                      listing={listing}
                      user={user}
                      onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
                        queryClient.invalidateQueries({ queryKey: ['bids', listingId] });
                      }}
                    />
                  )}
                </>
              ) : !isAuction && (
                <Button
                  onClick={handleBuyNow}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-lg font-semibold gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {t('listing.buyNow')} — {t('common.eur')}{listing.price?.toFixed(2)}
                </Button>
              )}
            </>
          )}

          {/* Location & details */}
          <div className="bg-card rounded-xl border p-4 sm:p-5 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{LOCATION_NAMES[listing.location] || listing.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span>{listing.views || 0} {t('listing.views')}</span>
            </div>
          </div>

          {/* Seller info */}
          <div className="bg-card rounded-xl border p-4 sm:p-5">
            <p className="text-sm text-muted-foreground mb-3">{t('listing.seller')}</p>
            <Link
              to={`/seller/${encodeURIComponent(listing.seller_id)}`}
              className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {sellerProfile?.profile_picture_url ? (
                  <img src={sellerProfile.profile_picture_url} alt={listing.seller_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold group-hover:text-accent transition-colors">
                  {sellerProfile?.username || listing.seller_name || (sellerEmail ? sellerEmail.split('@')[0] : 'User')}
                </p>
                {sellerRating?.avg ? (
                  <StarRatingDisplay rating={sellerRating.avg} count={sellerRating.count} size="sm" />
                ) : (
                  <p className="text-xs text-muted-foreground">View profile →</p>
                )}
              </div>
            </Link>
            {!isOwner && (
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={handleContact}
              >
                <MessageSquare className="w-4 h-4" />
                {t('listing.contactSeller')}
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <WatchButton listingId={listingId} user={user} requireLogin={requireLogin} className="flex-1" />
            <ShareButton listing={listing} className="flex-1" />
            <ReportModal listing={listing} triggerClassName="flex-1" triggerSize="sm" />
          </div>

          {/* Delete button — owner only */}
          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="w-full gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Listing
            </Button>
          )}
          </div>
          </div>

          <DeleteListingModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={handleDeleteListing}
          loading={deletingListing}
          listingTitle={listing.title}
          />
          </div>
          );
          }