import { useEffect } from 'react'
import { supabase } from '@/supabase'
import { useI18n } from '@/lib/i18n.jsx';
import { useQuery } from '@tanstack/react-query';
import HeroSection from '@/components/home/HeroSection';
import ListingSection from '@/components/home/ListingSection';
import EndingSoonSection from '@/components/home/EndingSoonSection';
import EuroStartSection from '@/components/home/EuroStartSection';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { t } = useI18n();

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
  const trending = [...auctions]
    .sort((a, b) => (b.bid_count || 0) - (a.bid_count || 0))
    .slice(0, 4);
  const newest = activeListings.slice(0, 8);

  if (isLoading) {
    return (
      <div>
        <div className="h-64 bg-primary animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
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
            linkTo="/browse?sort=most_bids&type=auction"
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