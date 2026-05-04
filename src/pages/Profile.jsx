import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Star, Calendar, LogOut, Package, Gavel, Wallet as WalletIcon, Settings, AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import AuctionTimer from '@/components/listings/AuctionTimer';
import WalletCard from '@/components/wallet/WalletCard';
import TopUpModal from '@/components/wallet/TopUpModal';
import EditProfileCard from '@/components/profile/EditProfileCard';
import NotificationPrefsCard from '@/components/profile/NotificationPrefsCard';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { ENABLE_WALLET } from '@/lib/featureFlags';
import { getWalletState } from '@/lib/wallet';

export default function Profile() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [walletState, setWalletState] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { images, index }
  const [hasUnseenOutbid, setHasUnseenOutbid] = useState(false);
  const myBidListingIdsRef = useRef(new Set());

  // Wallet is intentionally disabled for free-launch mode.
  // Flip VITE_ENABLE_WALLET=true to re-enable once integrated.
  const enableWallet = ENABLE_WALLET;

  const ReviewImageLightbox = lightbox ? (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
      <button className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2" onClick={() => setLightbox(null)}>
        <X className="w-5 h-5" />
      </button>
      <img src={lightbox.images[lightbox.index]} alt="" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
      {lightbox.images.length > 1 && (
        <>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2" onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length })); }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2" onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length })); }}>
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 flex gap-1.5">
            {lightbox.images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: i })); }} className={`w-2 h-2 rounded-full ${i === lightbox.index ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  ) : null;

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const hasOAuthCode = !!params.get('code')
        const hasAccessTokenHash = typeof window.location.hash === 'string' && window.location.hash.includes('access_token=')

        if (hasAccessTokenHash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token })
            if (setSessionError) console.log(setSessionError)
          }

          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
        }

        if (hasOAuthCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (exchangeError) console.log(exchangeError)

          params.delete('code')
          params.delete('state')
          params.delete('error')
          params.delete('error_code')
          params.delete('error_description')
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
          window.history.replaceState({}, document.title, next)
        }
      } catch (e) {
        console.log(e)
      }

      const { data, error } = await supabase.auth.getUser()
      if (error) console.log(error)

      const authUser = data?.user
      if (!authUser) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .limit(1)

      if (profileError) console.log(profileError)

      const profile = Array.isArray(profileData) ? profileData[0] : null
      const u = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
        created_date: authUser.created_at,
      }

      setUser(u);
      if (enableWallet) {
        const ws = await getWalletState(u.id);
        setWalletState(ws);
      }
    })().catch(() => {})
  }, []);

  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)

      if (error) console.log(error)

      const profile = Array.isArray(data) ? (data[0] || null) : null
      if (profile) return profile

      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ id: user.id, email: user.email })
        .select('*')
        .single()

      if (createError) console.log(createError)
      return created || null
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user?.id) return

    const chan = supabase
      .channel(`reviews-profile-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `reviewed_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-reviews', user?.email] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(chan)
    }
  }, [user?.id, user?.email, queryClient]);

  const { data: myListings = [] } = useQuery({
    queryKey: ['my-listings', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) console.log(error)

      const rows = Array.isArray(data) ? data : []
      const now = new Date()
      const SOLD_STATUSES = new Set(['sold', 'sold_pending', 'in_progress', 'completed', 'cancelled'])
      return rows
        .filter(l => !l?.is_deleted)
        .filter(l => {
          const status = typeof l?.status === 'string' ? l.status : ''
          const isCancelled = status === 'cancelled' || status === 'canceled' || status.includes('cancel')
          // Hide expired auctions ONLY if they are not sold/completed.
          if (!(l?.listing_type === 'auction' && l?.auction_end && new Date(l.auction_end) < now)) return true
          if (l?.is_sold) return true
          if (isCancelled) return true
          if (SOLD_STATUSES.has(status)) return true
          return false
        })
    },
    enabled: !!user,
  });

  const { data: myBids = [] } = useQuery({
    queryKey: ['my-bids', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) console.log(error)

      const rows = Array.isArray(data) ? data : []
      const normalized = rows.map(b => ({ ...b, created_date: b.created_date || b.created_at }))

      const listingIds = Array.from(new Set(normalized.map(b => b?.listing_id).filter(Boolean)))
      if (listingIds.length === 0) return []

      const { data: listingData, error: listingErr } = await supabase
        .from('listings')
        .select('id,title,images,auction_end,current_bid,status,is_sold,is_deleted,listing_type')
        .in('id', listingIds)

      if (listingErr) {
        console.log(listingErr)
        return []
      }

      const listingById = new Map((Array.isArray(listingData) ? listingData : []).map(l => [l.id, l]))
      const now = new Date()

      const isListingActive = (l) => {
        if (!l || l?.is_deleted) return false
        if (l?.is_sold) return false
        if (l?.status !== 'active') return false
        if (l?.listing_type === 'auction' && l?.auction_end && new Date(l.auction_end) < now) return false
        const status = typeof l?.status === 'string' ? l.status : ''
        if (status === 'cancelled' || status === 'canceled' || status.includes('cancel')) return false
        return true
      }

      const maxBidByListingId = new Map()
      for (const b of normalized) {
        const lid = b?.listing_id
        const amt = typeof b?.amount === 'number' ? b.amount : Number(b?.amount)
        if (!lid || !Number.isFinite(amt)) continue
        const placedAt = b?.created_date || b?.created_at || null
        const prev = maxBidByListingId.get(lid)
        if (prev == null || amt > prev.amount) {
          maxBidByListingId.set(lid, { amount: amt, placedAt })
        } else if (prev && amt === prev.amount) {
          const prevT = prev?.placedAt ? new Date(prev.placedAt).getTime() : 0
          const nextT = placedAt ? new Date(placedAt).getTime() : 0
          if (nextT >= prevT) maxBidByListingId.set(lid, { amount: amt, placedAt })
        }
      }

      const PLACEHOLDER_IMAGES = [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop',
      ]

      return listingIds
        .map((listingId, idx) => {
          const listing = listingById.get(listingId) || null
          if (!isListingActive(listing)) return null

          const myBidMeta = maxBidByListingId.get(listingId) || null
          const myMaxBid = myBidMeta?.amount ?? null
          const currentBid = listing?.current_bid != null ? Number(listing.current_bid) : null
          const isWinning = myMaxBid != null && currentBid != null ? myMaxBid >= currentBid : false
          const imageUrl = listing?.images?.[0] || PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length]

          return {
            id: `${user.id}-${listingId}`,
            listing_id: listingId,
            listing,
            my_bid: myMaxBid,
            placed_at: myBidMeta?.placedAt || null,
            isWinning,
            imageUrl,
          }
        })
        .filter(Boolean)
    },
    enabled: !!user,
  });

  useEffect(() => {
    try {
      const set = new Set((Array.isArray(myBids) ? myBids : []).map(b => b?.listing_id).filter(Boolean))
      myBidListingIdsRef.current = set
    } catch (e) {
      myBidListingIdsRef.current = new Set()
    }
  }, [myBids])

  useEffect(() => {
    if (!user?.id) return

    const onInsert = (payload) => {
      const row = payload?.new || null
      const listingId = row?.listing_id
      const bidderId = row?.bidder_id
      if (!listingId || !bidderId) return
      if (bidderId === user.id) return

      const set = myBidListingIdsRef.current
      if (!set || !set.has(listingId)) return

      queryClient.invalidateQueries({ queryKey: ['my-bids', user?.email] })
    }

    const chan = supabase
      .channel(`profile-bids-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, onInsert)
      .subscribe()

    return () => {
      supabase.removeChannel(chan)
    }
  }, [user?.id, user?.email, queryClient])

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) console.log(error)

      const rows = Array.isArray(data) ? data : []

      const reviewerIds = [...new Set(rows.map(r => r.reviewer_id).filter(Boolean))]
      const { data: reviewerProfiles, error: reviewerErr } = reviewerIds.length
        ? await supabase
          .from('profiles')
          .select('id, email, username')
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
          reviewer_name: p?.username || (p?.email ? p.email.split('@')[0] : null),
          images: parsedImages,
          created_date: r.created_date || r.created_at,
        }
      })
    },
    enabled: !!user,
  });

  const { data: transactions = [], refetch: refetchTx } = useQuery({
    queryKey: ['my-wallet-tx', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) console.log(error)

      const rows = Array.isArray(data) ? data : []
      return rows.map(tx => ({ ...tx, created_date: tx.created_date || tx.created_at }))
    },
    enabled: enableWallet && !!user,
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const safeDate = (value) => {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const globalRestrictionUntil = safeDate(userProfile?.restricted_until)
  const bidRestrictionUntil = safeDate(userProfile?.bid_restricted_until)
  const listingRestrictionUntil = safeDate(userProfile?.listing_restricted_until)

  const restrictionUntilCandidates = [globalRestrictionUntil, bidRestrictionUntil, listingRestrictionUntil].filter(Boolean)
  const restrictionUntil = restrictionUntilCandidates.length
    ? restrictionUntilCandidates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max), restrictionUntilCandidates[0])
    : null

  const nowMs = Date.now()
  const isGlobalTimeRestricted = !!(globalRestrictionUntil && globalRestrictionUntil.getTime() > nowMs)
  const isBidTimeRestricted = !!(bidRestrictionUntil && bidRestrictionUntil.getTime() > nowMs)
  const isListingTimeRestricted = !!(listingRestrictionUntil && listingRestrictionUntil.getTime() > nowMs)

  // Treat can_* = false as a "permanent" restriction only when there's no corresponding timestamp.
  // Temporary strikes should be represented by the *_restricted_until timestamps.
  const isPermanentlyBidRestricted = userProfile?.can_bid === false && !bidRestrictionUntil && !globalRestrictionUntil
  const isPermanentlyListingRestricted =
    userProfile?.can_create_listings === false && !listingRestrictionUntil && !globalRestrictionUntil

  const isTimeRestricted = isGlobalTimeRestricted || isBidTimeRestricted || isListingTimeRestricted
  const isRestricted = isTimeRestricted || isPermanentlyBidRestricted || isPermanentlyListingRestricted

  const refreshWallet = async () => {
    if (!user || !enableWallet) return;
    const ws = await getWalletState(user.id);
    setWalletState(ws);
    refetchTx();
  };

  const handleProfileSaved = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) console.log(error)

    const authUser = data?.user
    if (authUser) {
      setUser(prev => ({
        ...(prev || {}),
        id: authUser.id,
        email: authUser.email,
        created_date: authUser.created_at,
      }))
    }
    refetchProfile();
  };

  const avatarUrl = userProfile?.profile_picture_url;

  const [activeTab, setActiveTab] = useState(enableWallet ? (isMobile ? 'wallet' : 'bids') : 'bids');

  useEffect(() => {
    setActiveTab(enableWallet ? (isMobile ? 'wallet' : 'bids') : 'bids');
  }, [isMobile]);

  useEffect(() => {
    const compute = () => {
      try {
        const seen = localStorage.getItem('outbid_last_seen')
        const updated = localStorage.getItem('outbid_last_update')
        if (!updated) return setHasUnseenOutbid(false)
        if (!seen) return setHasUnseenOutbid(true)
        setHasUnseenOutbid(new Date(updated) > new Date(seen))
      } catch (e) {
        setHasUnseenOutbid(false)
      }
    }

    compute()

    const onStorage = (e) => {
      if (e?.key === 'outbid_last_seen' || e?.key === 'outbid_last_update') compute()
    }

    window.addEventListener('storage', onStorage)
    const interval = setInterval(compute, 1500)

    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'bids') return
    try {
      localStorage.setItem('outbid_last_seen', new Date().toISOString())
    } catch (e) {
      // ignore
    }
  }, [activeTab])

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>{t('common.loading')}</p>
      </div>
    );
  }



  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {ReviewImageLightbox}
      {/* Profile header */}
      <div className="bg-card rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">{user.full_name}</h1>
          {userProfile?.username && (
            <p className="text-sm text-accent font-medium">@{userProfile.username}</p>
          )}
          <p className="text-muted-foreground text-sm">{user.email}</p>
          {userProfile?.bio && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{userProfile.bio}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="font-semibold">{avgRating || '—'}</span>
              <span className="text-muted-foreground">({reviews.length} {t('profile.reviews').toLowerCase()})</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {t('profile.memberSince')} {user.created_date ? format(new Date(user.created_date), 'MMM yyyy') : '2024'}
            </div>
          </div>

          {isRestricted && (
            <p className="mt-2 text-sm text-destructive">
              {isTimeRestricted
                ? `Your account is banned till ${restrictionUntil.toLocaleString()}`
                : 'Your account is banned'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('edit')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { error } = await supabase.auth.signOut()
              if (error) console.log(error)
            }}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('profile.logout')}
          </Button>
        </div>
      </div>

      {/* Desktop */}
      {!isMobile && (
        <div className={enableWallet ? 'grid lg:grid-cols-3 gap-6 items-start' : ''}>
          {enableWallet && (
            <div className="lg:col-span-1">
              {walletState ? (
                <WalletCard
                  walletState={walletState}
                  transactions={transactions}
                  onTopUp={() => setShowTopUp(true)}
                />
              ) : (
                <div className="bg-card border rounded-xl p-6 animate-pulse h-64" />
              )}
            </div>
          )}

          <div className={enableWallet ? 'lg:col-span-2' : ''}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto gap-1">
                {enableWallet && (
                  <TabsTrigger value="wallet" className="gap-2">
                    <WalletIcon className="w-4 h-4" />
                    {t('wallet.wallet')}
                  </TabsTrigger>
                )}
                <TabsTrigger value="bids" className="gap-2">
                  <span className="relative">
                    <Gavel className="w-4 h-4" />
                    {hasUnseenOutbid && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    )}
                  </span>
                  {t('profile.myBids')} ({myBids.length})
                </TabsTrigger>
                <TabsTrigger value="listings" className="gap-2">
                  <Package className="w-4 h-4" />
                  {t('profile.myListings')} ({myListings.length})
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-2">
                  <Star className="w-4 h-4" />
                  {t('profile.reviews')} ({reviews.length})
                </TabsTrigger>
              </TabsList>

              {enableWallet && (
                <TabsContent value="wallet" className="mt-6">
                  {walletState ? (
                    <WalletCard
                      walletState={walletState}
                      transactions={transactions}
                      onTopUp={() => setShowTopUp(true)}
                    />
                  ) : (
                    <div className="bg-card border rounded-xl p-6 animate-pulse h-64" />
                  )}
                </TabsContent>
              )}

              <TabsContent value="listings" className="mt-6 space-y-4">
               {(() => {
                 const SOLD_STATUSES = new Set(['sold', 'sold_pending', 'in_progress', 'completed', 'cancelled']);
                 const sold = myListings.filter(l => {
                   const status = typeof l?.status === 'string' ? l.status : ''
                   const isCancelled = status === 'cancelled' || status === 'canceled' || status.includes('cancel')
                   return isCancelled || l?.is_sold || SOLD_STATUSES.has(status)
                 });
                 const active = myListings.filter(l => l?.status === 'active' && !l?.is_sold);

                 if (sold.length === 0 && active.length === 0) {
                   return <div className="text-center py-12 text-muted-foreground">{t('common.noResults')}</div>;
                 }

                 return (
                   <>
                     {myListings.some(l => l.published) && (
                       <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex gap-3">
                         <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                         <p className="text-xs text-foreground">
                           Published listings cannot be edited. If you need to make changes, please contact support.
                         </p>
                       </div>
                     )}

                     {sold.length > 0 && (
                       <div>
                         <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sold ({sold.length})</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                           {sold.map((listing, i) => (
                             <ListingCard key={listing.id} listing={listing} index={i} />
                           ))}
                         </div>
                       </div>
                     )}

                     {active.length > 0 && (
                       <div className={sold.length > 0 ? 'mt-6' : ''}>
                         <h3 className="text-sm font-semibold text-muted-foreground mb-3">Active ({active.length})</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                           {active.map((listing, i) => (
                             <ListingCard key={listing.id} listing={listing} index={i} />
                           ))}
                         </div>
                       </div>
                     )}
                   </>
                 );
               })()}
              </TabsContent>

              <TabsContent value="bids" className="mt-6">
                {myBids.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t('common.noResults')}</div>
                ) : (
                  <div className="space-y-3">
                    {myBids.map(bid => (
                      <Link key={bid.id} to={`/listing/${bid.listing_id}`} className="block group">
                        <div className="bg-card rounded-lg border p-4 flex items-center justify-between group-hover:border-accent group-hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                              <img src={bid.imageUrl} alt={bid?.listing?.title || 'Listing'} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">{bid?.listing?.title || 'Listing'}</p>
                              {bid?.placed_at && (
                                <p className="text-xs text-muted-foreground truncate">
                                  Bid placed {format(new Date(bid.placed_at), 'MMM d, yyyy HH:mm')}
                                </p>
                              )}
                            </div>
                          </div>
                          {bid?.listing?.auction_end && (
                            <div className="mr-3 shrink-0">
                              <div className="px-3 py-1 rounded-full border border-border/60 bg-muted/40">
                                <AuctionTimer endDate={bid.listing.auction_end} compact />
                              </div>
                            </div>
                          )}
                          <Badge className={`${bid.isWinning ? 'bg-emerald-500 text-white' : 'bg-destructive text-destructive-foreground'} font-bold ml-3 shrink-0`}>
                            €{(bid.my_bid != null ? Number(bid.my_bid) : 0).toFixed(2)}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="edit" className="mt-6 space-y-6">
                <EditProfileCard
                  user={user}
                  profile={userProfile}
                  lang={lang}
                  onProfileSaved={handleProfileSaved}
                />
                <NotificationPrefsCard user={user} />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t('common.noResults')}</div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-card rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-accent text-accent' : 'text-muted'}`} />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{review.reviewer_name || 'User'}</span>
                        </div>
                        {review.review_text && <p className="text-sm text-muted-foreground">{review.review_text}</p>}
                        {review.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {review.images.map((url, i) => (
                              <button key={i} onClick={() => setLightbox({ images: review.images, index: i })} className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 hover:border-accent transition-all">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Mobile */}
      {isMobile && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1 w-full">
            {enableWallet && (
              <TabsTrigger value="wallet" className="gap-1.5 flex-1 text-xs sm:text-sm">
                <WalletIcon className="w-4 h-4" />
                {t('wallet.wallet')}
              </TabsTrigger>
            )}
            <TabsTrigger value="bids" className="gap-1.5 flex-1 text-xs sm:text-sm">
              <span className="relative">
                <Gavel className="w-4 h-4" />
                {hasUnseenOutbid && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                )}
              </span>
              {t('profile.myBids')} ({myBids.length})
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-1.5 flex-1 text-xs sm:text-sm">
              <Package className="w-4 h-4" />
              {t('profile.myListings')} ({myListings.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5 flex-1 text-xs sm:text-sm">
              <Star className="w-4 h-4" />
              {t('profile.reviews')} ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {enableWallet && (
            <TabsContent value="wallet" className="mt-6">
              {walletState ? (
                <WalletCard
                  walletState={walletState}
                  transactions={transactions}
                  onTopUp={() => setShowTopUp(true)}
                />
              ) : (
                <div className="bg-card border rounded-xl p-6 animate-pulse h-64" />
              )}
            </TabsContent>
          )}

          <TabsContent value="listings" className="mt-6 space-y-4">
            {(() => {
              const SOLD_STATUSES = new Set(['sold', 'sold_pending', 'in_progress', 'completed', 'cancelled']);
              const sold = myListings.filter(l => {
                const status = typeof l?.status === 'string' ? l.status : ''
                const isCancelled = status === 'cancelled' || status === 'canceled' || status.includes('cancel')
                return isCancelled || l?.is_sold || SOLD_STATUSES.has(status)
              });
              const active = myListings.filter(l => l?.status === 'active' && !l?.is_sold);

              if (sold.length === 0 && active.length === 0) {
                return <div className="text-center py-12 text-muted-foreground">{t('common.noResults')}</div>;
              }

              return (
                <>
                  {myListings.some(l => l.published) && (
                    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex gap-3">
                      <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        Published listings cannot be edited. If you need to make changes, please contact support.
                      </p>
                    </div>
                  )}

                  {sold.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sold ({sold.length})</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {sold.map((listing, i) => (
                          <ListingCard key={listing.id} listing={listing} index={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {active.length > 0 && (
                    <div className={sold.length > 0 ? 'mt-6' : ''}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Active ({active.length})</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {active.map((listing, i) => (
                          <ListingCard key={listing.id} listing={listing} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="bids" className="mt-6">
            {myBids.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('common.noResults')}</div>
            ) : (
              <div className="space-y-3">
                {myBids.map(bid => (
                  <Link key={bid.id} to={`/listing/${bid.listing_id}`} className="block group">
                    <div className="bg-card rounded-lg border p-4 flex items-center justify-between group-hover:border-accent group-hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                          <img src={bid.imageUrl} alt={bid?.listing?.title || 'Listing'} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">{bid?.listing?.title || 'Listing'}</p>
                          {bid?.placed_at && (
                            <p className="text-xs text-muted-foreground truncate">
                              Bid placed {format(new Date(bid.placed_at), 'MMM d, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                      {bid?.listing?.auction_end && (
                        <div className="mr-3 shrink-0">
                          <div className="px-3 py-1 rounded-full border border-border/60 bg-muted/40">
                            <AuctionTimer endDate={bid.listing.auction_end} compact />
                          </div>
                        </div>
                      )}
                      <Badge className={`${bid.isWinning ? 'bg-emerald-500 text-white' : 'bg-destructive text-destructive-foreground'} font-bold ml-3 shrink-0`}>
                        €{(bid.my_bid != null ? Number(bid.my_bid) : 0).toFixed(2)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-6 space-y-6">
            <EditProfileCard
              user={user}
              profile={userProfile}
              lang={lang}
              onProfileSaved={handleProfileSaved}
            />
            <NotificationPrefsCard user={user} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('common.noResults')}</div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-accent text-accent' : 'text-muted'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{review.reviewer_name || 'User'}</span>
                    </div>
                    {review.review_text && <p className="text-sm text-muted-foreground">{review.review_text}</p>}
                   {review.images?.length > 0 && (
                     <div className="flex flex-wrap gap-2 mt-2">
                       {review.images.map((url, i) => (
                         <button key={i} onClick={() => setLightbox({ images: review.images, index: i })} className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 hover:border-accent transition-all">
                           <img src={url} alt="" className="w-full h-full object-cover" />
                         </button>
                       ))}
                     </div>
                   )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {enableWallet && user && walletState && (
        <TopUpModal
          open={showTopUp}
          onClose={() => setShowTopUp(false)}
          user={user}
          walletBalance={walletState.wallet_balance}
          onSuccess={refreshWallet}
        />
      )}
    </div>
  );
}