import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';
import { AnimatePresence } from 'framer-motion';
import { Flame, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EndingSoonCard from '@/components/listings/EndingSoonCard';

const ONE_HOUR_MS = 60 * 60 * 1000;

function getEndingSoon(listings) {
  const now = new Date();
  return listings
    .filter(l => {
      if (l.listing_type !== 'auction' || l.status !== 'active' || l.is_deleted) return false;
      if (!l.auction_end) return false;
      const end = new Date(l.auction_end);
      return end > now && end - now <= ONE_HOUR_MS;
    })
    .sort((a, b) => new Date(a.auction_end) - new Date(b.auction_end));
}

export default function EndingSoon() {
  const [allListings, setAllListings] = useState([]);
  const [visibleIds, setVisibleIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchListings = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*');

    if (error) console.log(error);

    if (!error) console.log('[Supabase] DB OK: fetched listings', { count: (data || []).length });

    const activeListings = (data || []).filter(l => l.status === 'active');
    setAllListings(activeListings.filter(l => !l.is_deleted));
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchListings]);

  // Derive visible listings from allListings in real-time
  const endingSoon = getEndingSoon(allListings);

  // Sync visibleIds with endingSoon
  useEffect(() => {
    setVisibleIds(new Set(endingSoon.map(l => l.id)));
  }, [allListings]);

  const handleExpired = useCallback((id) => {
    setVisibleIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const visibleListings = endingSoon.filter(l => visibleIds.has(l.id));

  const finalMinute = visibleListings.filter(l => new Date(l.auction_end) - new Date() < 60 * 1000);
  const underTen = visibleListings.filter(l => { const d = new Date(l.auction_end) - new Date(); return d >= 60 * 1000 && d < 10 * 60 * 1000; });
  const others = visibleListings.filter(l => new Date(l.auction_end) - new Date() >= 10 * 60 * 1000);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Ending Soon</h1>
            {visibleListings.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {visibleListings.length} live
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Auctions ending in the next hour — act fast!
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchListings}
          className="gap-2 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-card rounded-xl border animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : visibleListings.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Flame className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No auctions ending soon</p>
          <p className="text-sm mt-1">Check back in a bit — new auctions are always starting.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Final minute section */}
          {finalMinute.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Final Minute</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {finalMinute.map((listing, i) => (
                    <EndingSoonCard
                      key={listing.id}
                      listing={listing}
                      index={i}
                      onExpired={handleExpired}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Ending within 10 min */}
          {underTen.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                <h2 className="text-sm font-bold text-orange-500 uppercase tracking-wide">Under 10 Minutes</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {underTen.map((listing, i) => (
                    <EndingSoonCard key={listing.id} listing={listing} index={i} onExpired={handleExpired} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Ending within the hour */}
          {others.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <h2 className="text-sm font-bold text-yellow-600 uppercase tracking-wide">Ending This Hour</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {others.map((listing, i) => (
                    <EndingSoonCard key={listing.id} listing={listing} index={i} onExpired={handleExpired} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Auto-refreshes every 30 seconds · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}