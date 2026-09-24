import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/supabase'

// Unread-message count plus the yellow "unseen" dots for Deals and outbid bids.
// Computed once in NavBadgesProvider (mounted by AppLayout) and read with useNavBadges():
// the realtime channels below are named per user, and Supabase refuses a second
// subscription to the same channel, so they must not run once per component.
const NavBadgesContext = createContext({ unreadCount: 0, hasUnseenDeals: false, hasUnseenOutbid: false })

export function NavBadgesProvider({ children }) {
  return createElement(NavBadgesContext.Provider, { value: useNavBadgesState() }, children)
}

export function useNavBadges() {
  return useContext(NavBadgesContext)
}

function useNavBadgesState() {
  const { isAuthenticated, user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasUnseenDeals, setHasUnseenDeals] = useState(false)
  const [hasUnseenOutbid, setHasUnseenOutbid] = useState(false)

  const myBidListingIdsRef = useRef(new Set())
  const myMaxBidByListingIdRef = useRef(new Map())
  const wasWinningByListingIdRef = useRef(new Map())

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

  return { unreadCount, hasUnseenDeals, hasUnseenOutbid }
}

// Clears the matching dot when the user opens Deals or Profile.
export function markNavSeen(to) {
  try {
    if (to === '/deals') localStorage.setItem('tx_last_seen', new Date().toISOString())
    if (to === '/profile') localStorage.setItem('outbid_last_seen', new Date().toISOString())
  } catch (e) {
    // ignore
  }
}
