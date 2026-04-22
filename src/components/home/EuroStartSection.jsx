import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Clock, Gavel } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n.jsx';
import AuctionTimer from '@/components/listings/AuctionTimer';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';

export default function EuroStartSection({ listings = [] }) {
  const { t } = useI18n();
  const euroListings = listings
    .filter(l => l.listing_type === 'auction' && l.status === 'active' && l.price <= 1 && l.auction_end && new Date(l.auction_end) > new Date())
    .sort((a, b) => new Date(a.auction_end) - new Date(b.auction_end))
    .slice(0, 8);

  if (euroListings.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <h2 className="text-xl sm:text-2xl font-display font-bold">{t('euro_start.title')}</h2>
          <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {euroListings.length} {t('euro_start.deals')}
          </span>
        </div>
        <Link
          to="/browse?type=auction&maxPrice=1"
          className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium transition-colors shrink-0"
        >
          {t('euro_start.seeAll')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Horizontally scrollable on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:gap-4 scrollbar-hide">
        {euroListings.map((listing, i) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="shrink-0 w-48 sm:w-auto"
          >
            <Link to={`/listing/${listing.id}`} className="group block bg-card rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={listing.images?.[0] || PLACEHOLDER}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* €1 badge */}
                <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  🔥 €1 start
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm font-medium leading-tight line-clamp-2 mb-1.5">{listing.title}</p>

                <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground mb-1">
                  <div className="flex items-center gap-1">
                    <Gavel className="w-3 h-3" />
                    <span>{listing.bid_count || 0} {t('hero_card.bids')}</span>
                  </div>
                  <span className="font-bold text-foreground text-sm">
                    €{(listing.current_bid || listing.price)?.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3 shrink-0" />
                  <AuctionTimer endDate={listing.auction_end} compact />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}