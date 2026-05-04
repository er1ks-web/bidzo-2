import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/supabase';
import { useI18n } from '@/lib/i18n';
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
import { CATEGORIES, SUBCATEGORIES, FILTERS, getActiveFilterKeys, normalizeCategory, normalizeTextKey } from '@/lib/categories';

const LOCATIONS = ['riga', 'daugavpils', 'liepaja', 'jelgava', 'jurmala', 'ventspils', 'rezekne', 'valmiera', 'jekabpils', 'ogre', 'tukums', 'cesis', 'other'];

export default function Browse() {
  const { t } = useI18n();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [listingType, setListingType] = useState(params.get('type') || 'all');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || 'all');
  const [brand, setBrand] = useState(normalizeTextKey(params.get('brand') || ''));
  const [model, setModel] = useState(params.get('model') || '');
  const [minYear, setMinYear] = useState(params.get('minYear') || '');
  const [fuel, setFuel] = useState(params.get('fuel') || '');
  const [maxMileage, setMaxMileage] = useState(params.get('maxMileage') || '');
  const [transmission, setTransmission] = useState(params.get('transmission') || '');
  const [size, setSize] = useState(params.get('size') || '');
  const [minRooms, setMinRooms] = useState(params.get('minRooms') || '');
  const [minArea, setMinArea] = useState(params.get('minArea') || '');
  const [loc, setLoc] = useState('all');
  const [sortBy, setSortBy] = useState(params.get('sort') || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  // React to URL changes (e.g. from CategoryGrid links)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setCategory(p.get('category') || 'all');
    setSubcategory(p.get('subcategory') || 'all');
    setListingType(p.get('type') || 'all');
    setSortBy(p.get('sort') || 'newest');
    setSearchQuery(p.get('q') || '');
    setBrand(normalizeTextKey(p.get('brand') || ''));
    setModel(p.get('model') || '');
    setMinYear(p.get('minYear') || '');
    setFuel(p.get('fuel') || '');
    setMaxMileage(p.get('maxMileage') || '');
    setTransmission(p.get('transmission') || '');
    setSize(p.get('size') || '');
    setMinRooms(p.get('minRooms') || '');
    setMinArea(p.get('minArea') || '');
  }, [location.search]);

  const normalizedSelectedCategory = category === 'all' ? 'all' : normalizeCategory(category);
  const activeSubcategories = normalizedSelectedCategory === 'all' ? [] : (SUBCATEGORIES[normalizedSelectedCategory] || []);
  const activeFilterKeys = normalizedSelectedCategory === 'all' ? [] : getActiveFilterKeys(normalizedSelectedCategory, subcategory === 'all' ? '' : subcategory);

  useEffect(() => {
    setSubcategory('all');
    setBrand('');
    setModel('');
    setMinYear('');
    setFuel('');
    setMaxMileage('');
    setTransmission('');
    setSize('');
    setMinRooms('');
    setMinArea('');
  }, [normalizedSelectedCategory]);

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

      const sellerIds = Array.from(
        new Set(
          rows
            .map(l => l?.seller_id)
            .filter(Boolean)
        )
      )

      if (sellerIds.length === 0) {
        console.log(`[Supabase] DB OK: fetched listings {count: ${rows.length}}`);
        return rows
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id,username,email')
        .in('id', sellerIds)

      if (profilesError) {
        console.log(profilesError)
        console.log(`[Supabase] DB OK: fetched listings {count: ${rows.length}}`);
        return rows
      }

      const profileById = new Map((profilesData || []).map(p => [p.id, p]))
      const mergedRows = rows.map(l => ({
        ...l,
        seller_profile: l?.seller_id ? (profileById.get(l.seller_id) || null) : null,
      }))

      console.log(`[Supabase] DB OK: fetched listings {count: ${mergedRows.length}}`);
      return mergedRows
    },
  });

  const brandOptions = useMemo(() => {
    if (!Array.isArray(listings) || normalizedSelectedCategory === 'all') return [];
    const map = new Map();
    for (const l of listings) {
      if (!l?.brand) continue;
      if (normalizeCategory(l?.category) !== normalizedSelectedCategory) continue;
      if (subcategory !== 'all' && (l?.subcategory || '') !== subcategory) continue;
      const norm = normalizeTextKey(l.brand);
      if (!norm) continue;
      if (!map.has(norm)) map.set(norm, norm.toUpperCase());
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [listings, normalizedSelectedCategory, subcategory]);

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
    if (normalizedSelectedCategory !== 'all') {
      result = result.filter(l => normalizeCategory(l?.category) === normalizedSelectedCategory);
    }

    // Subcategory
    if (normalizedSelectedCategory !== 'all' && subcategory !== 'all') {
      result = result.filter(l => (l?.subcategory || '') === subcategory);
    }

    // Dynamic filters
    if (normalizedSelectedCategory !== 'all') {
      const normBrand = normalizeTextKey(brand);
      if (activeFilterKeys.includes('brand') && normBrand) {
        result = result.filter(l => normalizeTextKey(l?.brand) === normBrand);
      }

      const normModel = normalizeTextKey(model);
      if (activeFilterKeys.includes('model') && normModel) {
        result = result.filter(l => normalizeTextKey(l?.model) === normModel);
      }

      const y = Number(minYear);
      if (activeFilterKeys.includes('year') && Number.isFinite(y) && y > 0) {
        result = result.filter(l => {
          const ly = Number(l?.year);
          return Number.isFinite(ly) && ly >= y;
        });
      }

      const normFuel = fuel.trim().toLowerCase();
      if (activeFilterKeys.includes('fuel') && normFuel) {
        result = result.filter(l => (l?.fuel || '').toString().toLowerCase() === normFuel);
      }

      const mm = Number(maxMileage);
      if (activeFilterKeys.includes('mileage') && Number.isFinite(mm) && mm > 0) {
        result = result.filter(l => {
          const lm = Number(l?.mileage);
          return Number.isFinite(lm) && lm <= mm;
        });
      }

      const normTrans = transmission.trim().toLowerCase();
      if (activeFilterKeys.includes('transmission') && normTrans) {
        result = result.filter(l => (l?.transmission || '').toString().toLowerCase() === normTrans);
      }

      const normSize = size.trim().toLowerCase();
      if (activeFilterKeys.includes('size') && normSize) {
        result = result.filter(l => (l?.size || '').toString().toLowerCase() === normSize);
      }

      const mr = Number(minRooms);
      if (activeFilterKeys.includes('rooms') && Number.isFinite(mr) && mr > 0) {
        result = result.filter(l => {
          const lr = Number(l?.rooms);
          return Number.isFinite(lr) && lr >= mr;
        });
      }

      const ma = Number(minArea);
      if (activeFilterKeys.includes('area') && Number.isFinite(ma) && ma > 0) {
        result = result.filter(l => {
          const la = Number(l?.area);
          return Number.isFinite(la) && la >= ma;
        });
      }
    }

    // Location
    if (loc !== 'all') result = result.filter(l => l.location === loc);

    // Sort
    if (sortBy === 'price_asc') result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    else if (sortBy === 'price_desc') result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    else if (sortBy === 'ending_soon') {
      const nowTs = Date.now()
      result = result
        .filter(l => l.auction_end && new Date(l.auction_end).getTime() > nowTs)
        .sort((a, b) => new Date(a.auction_end).getTime() - new Date(b.auction_end).getTime());
    }
    else if (sortBy === 'most_bids') result.sort((a, b) => (b.bid_count || 0) - (a.bid_count || 0));
    // newest is default sort from API

    return result;
  }, [
    listings,
    searchQuery,
    listingType,
    category,
    subcategory,
    brand,
    model,
    minYear,
    fuel,
    maxMileage,
    transmission,
    size,
    minRooms,
    minArea,
    loc,
    sortBy,
    normalizedSelectedCategory,
    activeFilterKeys,
  ]);

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

          {normalizedSelectedCategory !== 'all' && activeSubcategories.length > 0 && (
            <Select value={subcategory} onValueChange={setSubcategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('create_extra.subcategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                {activeSubcategories.map(sc => (
                  <SelectItem key={sc} value={sc}>{t(`subcategories.${normalizedSelectedCategory}.${sc}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={loc} onValueChange={setLoc}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('create.region')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {LOCATIONS.map(loc => (
                 <SelectItem key={loc} value={loc}>{t(`locations.${loc}`)}</SelectItem>
               ))}
            </SelectContent>
          </Select>

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('brand') && (
            <Select value={brand || 'all'} onValueChange={(v) => setBrand(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('filters.brand')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                {brandOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('model') && (
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t('filters.model')}
              className="w-40"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('year') && (
            <Input
              type="number"
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              placeholder={t('filters.year')}
              className="w-40"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('fuel') && (
            <Input
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              placeholder={t('filters.fuel')}
              className="w-40"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('mileage') && (
            <Input
              type="number"
              value={maxMileage}
              onChange={(e) => setMaxMileage(e.target.value)}
              placeholder={t('filters.mileageKm')}
              className="w-40"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('transmission') && (
            <Input
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              placeholder={t('filters.transmission')}
              className="w-44"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('size') && (
            <Input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder={t('filters.size')}
              className="w-40"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('rooms') && (
            <Input
              type="number"
              value={minRooms}
              onChange={(e) => setMinRooms(e.target.value)}
              placeholder={t('filters.roomsMin')}
              className="w-40"
            />
          )}

          {normalizedSelectedCategory !== 'all' && activeFilterKeys.includes('area') && (
            <Input
              type="number"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
              placeholder={t('filters.areaMin')}
              className="w-40"
            />
          )}

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