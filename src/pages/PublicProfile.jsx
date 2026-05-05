import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase'
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Package, ArrowLeft, User, Star, CheckCircle2 } from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import ReviewList from '@/components/reviews/ReviewList';
import StarRatingDisplay from '@/components/reviews/StarRatingDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default function PublicProfile() {
  const { t } = useI18n();
  const urlParts = window.location.pathname.split('/');
  const sellerId = decodeURIComponent(urlParts[urlParts.length - 1]);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(sellerId || ''));

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [soldListings, setSoldListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [sellerUserId, setSellerUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soldExpanded, setSoldExpanded] = useState(false);
  const [activeExpanded, setActiveExpanded] = useState(false);

  const fetchReviews = async (reviewedId) => {
    const q = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!reviewedId) return []
    const { data, error } = await q.eq('reviewed_id', reviewedId)
    if (error) console.log(error)
    const rows = Array.isArray(data) ? data : []

    const reviewerIds = [...new Set(rows.map(r => r.reviewer_id).filter(Boolean))]
    const { data: reviewerProfiles, error: reviewerErr } = reviewerIds.length
      ? await supabase
        .from('public_profiles')
        .select('id, username')
        .in('id', reviewerIds)
      : { data: [], error: null }

    if (reviewerErr) console.log(reviewerErr)
    const profileById = new Map((Array.isArray(reviewerProfiles) ? reviewerProfiles : []).map(p => [p.id, p]))

    return rows.map(r => {
      const p = r?.reviewer_id ? profileById.get(r.reviewer_id) : null
      let parsedImages = []
      try {
        if (typeof r.images === 'string' && r.images.trim()) {
          const val = JSON.parse(r.images)
          if (Array.isArray(val)) parsedImages = val
        }
      } catch (e) {
        parsedImages = []
      }

      return {
        ...r,
        reviewer_name: p?.username || null,
        images: parsedImages,
        created_date: r.created_date || r.created_at,
      }
    })
  }

  useEffect(() => {
    if (!sellerId) return;
    async function load() {
      try {
        if (!isUuid) {
          setProfile(null)
          setListings([])
          setSoldListings([])
          setReviews([])
          setSellerUserId(null)
          return
        }

        const q = supabase.from('public_profiles').select('*').limit(1)
        const { data: profileData, error: profileError } = await q.eq('id', sellerId)
        if (profileError) console.log(profileError)
        const profileRes = Array.isArray(profileData) ? (profileData[0] || null) : null

        const sellerUserId = sellerId

        const [allListingsRes, reviewsRes] = await Promise.all([
          (async () => {
            if (!sellerUserId) return []

            const byIdRes = await supabase
              .from('listings')
              .select('*')
              .eq('seller_id', sellerUserId)
              .order('created_at', { ascending: false })
              .limit(100)

            if (byIdRes?.error) console.log(byIdRes.error)

            const rows = Array.isArray(byIdRes?.data) ? byIdRes.data : []

            const byListingId = new Map()
            for (const r of rows) {
              if (r?.id) byListingId.set(r.id, r)
            }

            return [...byListingId.values()].sort((a, b) => {
              const da = a?.created_at ? new Date(a.created_at).getTime() : 0
              const db = b?.created_at ? new Date(b.created_at).getTime() : 0
              return db - da
            })
          })(),
          fetchReviews(sellerUserId),
        ])

        const now = new Date()
        const visibleListings = (allListingsRes || []).filter(l => !l?.is_deleted)
        const SOLD_STATUSES = new Set(['sold', 'sold_pending', 'in_progress', 'completed'])

        const soldRes = visibleListings.filter(l => l?.is_sold || SOLD_STATUSES.has(l?.status))
        const activeRes = visibleListings
          .filter(l => l?.status === 'active' && !l?.is_sold)
          .filter(l => !(l?.listing_type === 'auction' && l?.auction_end && new Date(l.auction_end) < now))

        setProfile(profileRes || null);
        setListings(activeRes || []);
        setSoldListings(soldRes || []);
        setReviews(reviewsRes || []);
        setSellerUserId(sellerUserId || null)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sellerId]);

  useEffect(() => {
    if (!sellerUserId) return

    const chan = supabase
      .channel(`reviews-public-${sellerUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `reviewed_id=eq.${sellerUserId}` }, async () => {
        try {
          const rows = await fetchReviews(sellerUserId)
          setReviews(rows)
        } catch (e) {
          console.log(e)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(chan)
    }
  }, [sellerUserId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted" />
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const displayName =
    profile?.username ||
    'User';
  const memberSince = null;
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Link
        to="/browse"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('nav.browse')}
      </Link>

      {/* Profile header */}
      <div className="bg-card rounded-xl border p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="shrink-0">
          {profile?.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-9 h-9 text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold truncate">{displayName}</h1>

          {/* Star rating next to name */}
          {avgRating && (
            <div className="mt-1">
              <StarRatingDisplay rating={avgRating} count={reviews.length} size="md" />
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            {profile?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.city}
              </span>
            )}
            {memberSince && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Member since {memberSince}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {listings.length} active listing{listings.length !== 1 ? 's' : ''}
            </span>
          </div>
          {profile?.bio && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Reviews + Sold Listings — tabbed */}
      <div className="mt-8 bg-card rounded-xl border p-4 sm:p-6">
        <Tabs defaultValue="sold">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="sold" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Sold ({soldListings.length})
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <Star className="w-4 h-4" />
                Reviews ({reviews.length})
              </TabsTrigger>
            </TabsList>
            {avgRating && <StarRatingDisplay rating={avgRating} count={reviews.length} size="md" />}
          </div>

          <TabsContent value="sold">
            {soldListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sold listings yet</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(soldExpanded ? soldListings : soldListings.slice(0, 3)).map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i} />
                  ))}
                </div>

                {soldListings.length > 3 && (
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={() => setSoldExpanded(v => !v)}
                      className="text-xs text-accent hover:underline transition-colors"
                    >
                      {soldExpanded ? 'See less' : 'See all'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewList reviews={reviews} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Listings */}
      <h2 className="text-lg font-display font-bold mb-4 mt-8">Active Listings</h2>
      {listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No active listings</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(activeExpanded ? listings : listings.slice(0, 3)).map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} />
            ))}
          </div>

          {listings.length > 3 && (
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setActiveExpanded(v => !v)}
                className="text-xs text-accent hover:underline transition-colors"
              >
                {activeExpanded ? 'See less' : 'See all'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}