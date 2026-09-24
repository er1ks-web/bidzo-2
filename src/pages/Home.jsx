import { useEffect, useState } from 'react'
import { supabase } from '@/supabase'
import { useI18n } from '@/lib/i18n.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import HeroSection from '@/components/home/HeroSection';
import ListingSection from '@/components/home/ListingSection';
import EndingSoonSection from '@/components/home/EndingSoonSection';
import EuroStartSection from '@/components/home/EuroStartSection';
import { Skeleton } from '@/components/ui/skeleton';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';

export default function Home() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: allListings = [], isLoading, isSuccess, isError, error } = useQuery({
  queryKey: ['listings-home'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')

    if (error) {
      throw error
    }

    const rows = Array.isArray(data) ? data : []
    const sellerIds = Array.from(
      new Set(
        rows
          .map(l => l?.seller_id)
          .filter(Boolean)
      )
    )

    if (sellerIds.length === 0) return rows

    const { data: profilesData, error: profilesError } = await supabase
      .from('public_profiles')
      .select('id,username')
      .in('id', sellerIds)

    if (profilesError) {
      console.error('[Supabase] profiles fetch failed', profilesError)
      return rows
    }

    const profileById = new Map((profilesData || []).map(p => [p.id, p]))
    return rows.map(l => ({
      ...l,
      seller_profile: l?.seller_id ? (profileById.get(l.seller_id) || null) : null,
    }))
  },
});

  useEffect(() => {
    if (isSuccess) {
      console.info('[Supabase] DB OK: fetched listings', {
        count: Array.isArray(allListings) ? allListings.length : 0,
      });
    }
    if (isError) {
      console.error('[Supabase] DB ERROR: failed to fetch listings', error);
    }
  }, [isSuccess, isError, error, allListings]);

  // Live updates: new bids/prices/status changes are patched into the cached list,
  // new listings trigger a refetch (they need their seller's username), and
  // deleted rows drop out -- no page refresh needed.
  useEffect(() => {
    const patch = (fn) => queryClient.setQueryData(['listings-home'], (prev) => (Array.isArray(prev) ? fn(prev) : prev));
    const channel = supabase
      .channel('home-listings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, ({ new: row }) => {
        if (row?.id) patch((rows) => rows.map((l) => (l.id === row.id ? { ...l, ...row } : l)));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['listings-home'] });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'listings' }, ({ old }) => {
        if (old?.id) patch((rows) => rows.filter((l) => l.id !== old.id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Re-evaluate every 15s so auctions that just ended leave the page on their own.
  const [, setClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const now = new Date()
  const activeListings = (Array.isArray(allListings) ? allListings : [])
    .filter(l => !l?.is_deleted)
    .filter(l => !l?.is_sold)
    .filter(l => l?.status === 'active')
    .filter(l => !(l?.listing_type === 'auction' && l?.auction_end && new Date(l.auction_end) < now))

  const auctions = activeListings.filter(l => l.listing_type === 'auction');
  const endingSoon = [...auctions]
    .filter(l => l.auction_end && new Date(l.auction_end) > now)
    .sort((a, b) => new Date(a.auction_end) - new Date(b.auction_end))
    .slice(0, 4);
  // View-based, not bid-count-based -- auto-bidding can inflate bid_count
  // without reflecting genuine buyer interest the way view counts do.
  const trending = [...auctions]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 4);
  const newest = [...activeListings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
        {/* Mirrors HeroSection's own min-height (sm:min-h-[calc(100vh-65px)])
            so swapping in the real page doesn't shift anything already
            visible on screen -- this mismatch was the single biggest
            contributor to a 0.94 CLS score (see HeroSection.jsx). */}
        <div className="min-h-[520px] sm:min-h-[calc(100vh-65px)] flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-12 sm:h-16 w-full max-w-lg rounded-lg" />
                <Skeleton className="h-5 w-2/3 max-w-md rounded" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-11 w-36 rounded-lg" />
                  <Skeleton className="h-11 w-36 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-[16/9] rounded-xl" />)}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
          {[1, 2].map((section) => (
            <div key={section}>
              <Skeleton className="h-7 w-48 rounded mb-5" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[4/3] rounded-xl" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-5 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
      <HeroSection liveListings={activeListings} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* €1 Start deals — first thing after hero */}
        <EuroStartSection listings={activeListings} />

        {/* Ending Soon */}
        <EndingSoonSection allListings={activeListings} />

        {/* Trending Auctions */}
        {trending.length > 0 && (
          <ListingSection
            title={`⚡ ${t('sections.trending')}`}
            listings={trending}
            linkTo="/browse?sort=most_viewed&type=auction"
          />
        )}

        {/* New Listings */}
        <ListingSection
          title={t('sections.newListings')}
          listings={newest}
          linkTo="/browse"
        />
      </div>
    </div>
  );
}