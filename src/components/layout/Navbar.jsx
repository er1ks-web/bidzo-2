import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Search, Plus, MessageSquare, User, Gavel, Menu, Globe, Flame, Heart, LogOut, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/supabase'

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnseenDeals, setHasUnseenDeals] = useState(false);
  const [hasUnseenOutbid, setHasUnseenOutbid] = useState(false);

  const myBidListingIdsRef = useRef(new Set())
  const myMaxBidByListingIdRef = useRef(new Map())
  const wasWinningByListingIdRef = useRef(new Map())

  const logoUrl = 'https://xnadmnketxbquyrgqmcs.supabase.co/storage/v1/object/public/site-assets/bidzo-web-logo-new.png'
  const fallbackLogoUrl = 'https://media.base44.com/images/public/69c6629c38b4f05a07d13e7c/236f5728d_ChatGPT_Image_Mar_28__2026__06_25_47_PM-removebg-preview.png'

  const navLinks = [
    { to: '/', label: t('nav.home'), icon: Gavel },
    { to: '/browse', label: t('nav.browse'), icon: Search },
    { to: '/ending-soon', label: t('nav_extra.endingSoon'), icon: Flame },
    ...(isAuthenticated
      ? [
          { to: '/create', label: t('nav.sell'), icon: Plus },
          { to: '/messages', label: t('nav.messages'), icon: MessageSquare },
          { to: '/favourites', label: t('nav_extra.watchlist'), icon: Heart },
          { to: '/deals', label: t('deals.title'), icon: Trophy },
          { to: '/profile', label: t('nav.profile'), icon: User },
        ]
      : [{ to: '/login', label: t('profile.login') || 'Login', icon: User }]),
  ];



  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/browse?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadCount(0)
      setHasUnseenDeals(false)
      setHasUnseenOutbid(false)
      return;
    }

    let cancelled = false

    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (error) console.log(error)
      if (!cancelled) setUnreadCount(typeof count === 'number' ? count : 0)
    }

    fetchUnread().catch(() => {})

    const chan = supabase
      .channel(`navbar-unread-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, () => {
        fetchUnread().catch(() => {})
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(chan)
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false

    const refreshMyBids = async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('listing_id,amount,created_at')
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (cancelled) return
      if (error) {
        console.log(error)
        myBidListingIdsRef.current = new Set()
        myMaxBidByListingIdRef.current = new Map()
        return
      }

      const rows = Array.isArray(data) ? data : []
      const listingIds = new Set(rows.map(r => r?.listing_id).filter(Boolean))
      const maxByListing = new Map()
      for (const r of rows) {
        const lid = r?.listing_id
        const amt = typeof r?.amount === 'number' ? r.amount : Number(r?.amount)
        if (!lid || !Number.isFinite(amt)) continue
        const prev = maxByListing.get(lid)
        if (prev == null || amt > prev) maxByListing.set(lid, amt)
      }

      const listingIdArr = Array.from(listingIds)
      const { data: listingsData, error: listingsErr } = listingIdArr.length
        ? await supabase
          .from('listings')
          .select('id,current_bid,is_sold,is_deleted,status,auction_end,listing_type')
          .in('id', listingIdArr)
        : { data: [], error: null }

      if (cancelled) return
      if (listingsErr) {
        console.log(listingsErr)
      }

      const listingById = new Map((Array.isArray(listingsData) ? listingsData : []).map(l => [l.id, l]))
      const now = new Date()
      const nextWasWinning = new Map()
      for (const lid of listingIdArr) {
        const listing = listingById.get(lid)
        if (!listing || listing?.is_deleted || listing?.is_sold) {
          nextWasWinning.set(lid, false)
          continue
        }
        const status = typeof listing?.status === 'string' ? listing.status : ''
        const isCancelled = status === 'cancelled' || status === 'canceled' || status.includes('cancel')
        const isExpired = listing?.listing_type === 'auction' && listing?.auction_end && new Date(listing.auction_end) < now
        if (isCancelled || isExpired || status !== 'active') {
          nextWasWinning.set(lid, false)
          continue
        }

        const myMax = maxByListing.get(lid)
        const currentBid = listing?.current_bid != null ? Number(listing.current_bid) : null
        const isWinning = myMax != null && currentBid != null ? myMax >= currentBid : false
        nextWasWinning.set(lid, !!isWinning)
      }

      myBidListingIdsRef.current = listingIds
      myMaxBidByListingIdRef.current = maxByListing
      wasWinningByListingIdRef.current = nextWasWinning
    }

    refreshMyBids().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const markUnseen = () => {
      try {
        localStorage.setItem('outbid_last_update', new Date().toISOString())
      } catch (e) {
        // ignore
      }
    }

    const onInsertBid = (payload) => {
      const row = payload?.new || null
      if (!row) return

      const listingId = row?.listing_id
      const bidderId = row?.bidder_id
      if (!listingId || !bidderId) return

      // If I place a new bid, start tracking this listing immediately.
      if (bidderId === user.id) {
        const newAmt = typeof row?.amount === 'number' ? row.amount : Number(row?.amount)
        if (!Number.isFinite(newAmt)) return

        const nextSet = new Set(myBidListingIdsRef.current)
        nextSet.add(listingId)
        myBidListingIdsRef.current = nextSet

        const myMax = myMaxBidByListingIdRef.current?.get(listingId)
        if (myMax == null || newAmt > myMax) {
          myMaxBidByListingIdRef.current?.set(listingId, newAmt)
        }
        wasWinningByListingIdRef.current?.set(listingId, true)
        return
      }

      const myListingIds = myBidListingIdsRef.current
      if (!myListingIds || !myListingIds.has(listingId)) return

      const myMax = myMaxBidByListingIdRef.current?.get(listingId)
      const newAmt = typeof row?.amount === 'number' ? row.amount : Number(row?.amount)
      if (!Number.isFinite(newAmt)) return

      // Only notify when we transition from winning (green) -> outbid (red).
      const wasWinning = wasWinningByListingIdRef.current?.get(listingId)
      if (wasWinning && myMax != null && newAmt > myMax) {
        wasWinningByListingIdRef.current?.set(listingId, false)
        markUnseen()
      }
    }

    const chan = supabase
      .channel(`navbar-outbid-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, onInsertBid)
      .subscribe()

    return () => {
      supabase.removeChannel(chan)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

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
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const markUnseen = () => {
      try {
        localStorage.setItem('tx_last_update', new Date().toISOString())
      } catch (e) {
        // ignore
      }
    }

    const onChange = (payload) => {
      console.log('[NavbarDealsRT] auction_transactions change', payload)
      markUnseen()
    }

    const buyerChannel = supabase
      .channel(`navbar-tx-buyer-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_transactions', filter: `buyer_id=eq.${user.id}` },
        onChange
      )
      .subscribe((status) => {
        console.log('[NavbarDealsRT] buyer channel status', status)
      })

    const sellerChannel = supabase
      .channel(`navbar-tx-seller-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_transactions', filter: `seller_id=eq.${user.id}` },
        onChange
      )
      .subscribe((status) => {
        console.log('[NavbarDealsRT] seller channel status', status)
      })

    return () => {
      supabase.removeChannel(buyerChannel)
      supabase.removeChannel(sellerChannel)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const compute = () => {
      try {
        const seen = localStorage.getItem('tx_last_seen')
        const updated = localStorage.getItem('tx_last_update')
        if (!updated) return setHasUnseenDeals(false)
        if (!seen) return setHasUnseenDeals(true)
        setHasUnseenDeals(new Date(updated) > new Date(seen))
      } catch (e) {
        setHasUnseenDeals(false)
      }
    }

    compute()

    const onStorage = (e) => {
      if (e?.key === 'tx_last_seen' || e?.key === 'tx_last_update') compute()
    }

    window.addEventListener('storage', onStorage)
    const interval = setInterval(compute, 1500)

    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(interval)
    }
  }, [isAuthenticated, user?.id]);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src={logoUrl || fallbackLogoUrl}

            alt="Bidzo" className="h-9 w-auto object-contain"

            style={{ maxWidth: '110px' }} />
            
          </Link>

          {/* Search - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('nav.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
              
            </div>
          </form>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) =>
            <Link key={to} to={to} onClick={() => {
              if (to === '/deals') {
                localStorage.setItem('tx_last_seen', new Date().toISOString());
              }
              if (to === '/profile') {
                localStorage.setItem('outbid_last_seen', new Date().toISOString());
              }
            }}>
                <Button
                variant={location.pathname === to ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2">
                  <span className="relative">
                    <Icon className="w-4 h-4" />
                    {to === '/messages' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    )}
                    {to === '/deals' && hasUnseenDeals && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    )}
                    {to === '/profile' && hasUnseenOutbid && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    )}
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'lv' ? 'en' : 'lv')}
              className="ml-2 gap-1.5">
              
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">{lang}</span>
            </Button>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLang(lang === 'lv' ? 'en' : 'lv')}>
              
              <Globe className="w-4 h-4" />
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-2 mt-8">
                  <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('nav.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10" />
                      
                    </div>
                  </form>
                  {navLinks.map(({ to, label, icon: Icon }) =>
                  <Link key={to} to={to} onClick={() => {
                    setMobileOpen(false);
                    if (to === '/deals') {
                      localStorage.setItem('tx_last_seen', new Date().toISOString());
                    }
                    if (to === '/profile') {
                      localStorage.setItem('outbid_last_seen', new Date().toISOString());
                    }
                  }}>
                      <Button
                      variant={location.pathname === to ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3">
                        <span className="relative">
                          <Icon className="w-5 h-5" />
                          {to === '/messages' && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          )}
                          {to === '/deals' && hasUnseenDeals && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          )}
                          {to === '/profile' && hasUnseenOutbid && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          )}
                        </span>
                        {label}
                      </Button>
                    </Link>
                  )}
                  {isAuthenticated && user && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => logout()}>
                        
                        <LogOut className="w-5 h-5" />
                        {t('nav_extra.logOut')}
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>);

}