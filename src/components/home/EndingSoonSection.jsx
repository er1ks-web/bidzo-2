import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n.jsx';
import EndingSoonCard from '@/components/listings/EndingSoonCard';

const TEN_MINUTES_MS = 10 * 60 * 1000;

function getEndingSoon(listings) {
  const now = new Date();
  return listings
    .filter(l => {
      if (l.listing_type !== 'auction' || l.status !== 'active') return false;
      if (!l.auction_end) return false;
      const end = new Date(l.auction_end);
      return end > now && end - now <= TEN_MINUTES_MS;
    })
    .sort((a, b) => new Date(a.auction_end) - new Date(b.auction_end))
    .slice(0, 8);
}

export default function EndingSoonSection({ allListings }) {
  const { t } = useI18n();
  const [visibleIds, setVisibleIds] = useState(() => new Set());

  const endingSoon = getEndingSoon(allListings);

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

  const visible = endingSoon.filter(l => visibleIds.has(l.id));

  if (visible.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-500" />
          <h2 className="text-xl sm:text-2xl font-display font-bold">{t('ending_soon.title')}</h2>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
            {visible.length} {t('ending_soon.live')}
          </span>
        </div>
        <Link
          to="/ending-soon"
          className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          {t('ending_soon.seeAll')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {visible.slice(0, 4).map((listing, i) => (
            <EndingSoonCard
              key={listing.id}
              listing={listing}
              index={i}
              onExpired={handleExpired}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}