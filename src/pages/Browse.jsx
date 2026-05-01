import { useState, useMemo, useEffect } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListingCard from '@/components/listings/ListingCard';
import CategoryGrid from '@/components/listings/CategoryGrid';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ['electronics', 'vehicles', 'fashion', 'home', 'sports', 'collectibles', 'books', 'toys', 'garden', 'other'];
const LOCATIONS = ['riga', 'daugavpils', 'liepaja', 'jelgava', 'jurmala', 'ventspils', 'rezekne', 'valmiera', 'jekabpils', 'ogre', 'tukums', 'cesis', 'other'];

export default function Browse() {
  const { t } = useI18n();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [listingType, setListingType] = useState(params.get('type') || 'all');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [loc, setLoc] = useState('all');
  const [sortBy, setSortBy] = useState(params.get('sort') || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  // React to URL changes (e.g. from CategoryGrid links)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setCategory(p.get('category') || 'all');
    setListingType(p.get('type') || 'all');
    setSortBy(p.get('sort') || 'newest');
    setSearchQuery(p.get('q') || '');
  }, [location.search]);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings-browse'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('is_sold', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.log(error);
        return [];
      }

      const rows = (data || []).filter(l => !l.is_sold);
      console.log(`[Supabase] DB OK: fetched listings {count: ${rows.length}}`);
      return rows;
    },
  });

  const filtered = useMemo(() => {
    let result = [...listings];

    // Hide deleted/expired/non-active listings
    const now = new Date();
    result = result
      .filter(l => !l?.is_deleted)
      .filter(l => l?.status === 'active')
      .filter(l => !(l?.listing_type === 'auction' && l?.auction_end && new Date(l.auction_end) < now));

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (listingType === 'auction') result = result.filter(l => l.listing_type === 'auction');
    if (listingType === 'fixed') result = result.filter(l => l.listing_type === 'fixed');

    // Category
    if (category !== 'all') result = result.filter(l => l.category === category);

    // Location
    if (loc !== 'all') result = result.filter(l => l.location === loc);

    // Sort
    if (sortBy === 'price_asc') result.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'price_desc') result.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === 'ending_soon') result = result.filter(l => l.auction_end && new Date(l.auction_end) > new Date()).sort((a, b) => new Date(a.auction_end) - new Date(b.auction_end));
    else if (sortBy === 'most_bids') result.sort((a, b) => (b.bid_count || 0) - (a.bid_count || 0));
    // newest is default sort from API

    return result;
  }, [listings, searchQuery, listingType, category, loc, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Categories */}
       <div className="mb-8">
         <h2 className="text-lg font-display font-bold mb-4">{t('browse.title')}</h2>
         <CategoryGrid selectedCategory={category} />
       </div>

      {/* Search & Type Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('nav.search')}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Tabs value={listingType} onValueChange={setListingType}>
            <TabsList>
              <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
              <TabsTrigger value="auction">{t('filters.auctions')}</TabsTrigger>
              <TabsTrigger value="fixed">{t('filters.fixedPrice')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card rounded-xl border">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('create.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{t(`categories.${cat}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={loc} onValueChange={setLoc}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('create.location')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {LOCATIONS.map(loc => (
                 <SelectItem key={loc} value={loc}>{t(`locations.${loc}`)}</SelectItem>
               ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('filters.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('filters.newest')}</SelectItem>
              <SelectItem value="price_asc">{t('filters.priceAsc')}</SelectItem>
              <SelectItem value="price_desc">{t('filters.priceDesc')}</SelectItem>
              <SelectItem value="ending_soon">{t('filters.endingSoon')}</SelectItem>
              <SelectItem value="most_bids">{t('filters.mostBids')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} {t('browse.results')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}