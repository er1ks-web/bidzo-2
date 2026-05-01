import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Gavel, Tag, Eye, MapPin, User, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AuctionTimer from './AuctionTimer';
import { motion } from 'framer-motion';

const LOCATION_NAMES = {
  riga: 'Rīga', daugavpils: 'Daugavpils', liepaja: 'Liepāja',
  jelgava: 'Jelgava', jurmala: 'Jūrmala', ventspils: 'Ventspils',
  rezekne: 'Rēzekne', valmiera: 'Valmiera', jekabpils: 'Jēkabpils',
  ogre: 'Ogre', tukums: 'Tukums', cesis: 'Cēsis', other: 'Cita',
};

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop',
];

export default function ListingCard({ listing, index = 0, user = null }) {
  const { t } = useI18n();
  const isAuction = listing.listing_type === 'auction';
  const hasEnded = isAuction && listing.auction_end && new Date(listing.auction_end) < new Date();
  const isActive = listing.status === 'active' && !hasEnded;
  const imageUrl = listing.images?.[0] || PLACEHOLDER_IMAGES[index % 3];
  const isOwner = user?.email === listing.seller_email;

  const displayPrice = isAuction
    ? (listing.current_bid != null ? listing.current_bid : listing.price)
    : listing.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/listing/${listing.id}`} className="group block">
        <div className="bg-card rounded-xl overflow-hidden border border-border/50 hover:border-accent/50 hover:shadow-lg transition-all duration-300">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className={cn(
                "font-semibold shadow-md",
                isAuction
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
              )}>
                {isAuction ? <Gavel className="w-3 h-3 mr-1" /> : <Tag className="w-3 h-3 mr-1" />}
                {isAuction ? t('listing.auction') : t('listing.fixed')}
              </Badge>
              {listing.featured && (
                <Badge className="bg-accent text-accent-foreground shadow-md">★</Badge>
              )}
            </div>
            {!isActive && (
              <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {listing.status === 'sold' ? t('listing.sold') : t('listing.expired')}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{LOCATION_NAMES[listing.location] || listing.location}</span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {isAuction
                    ? (listing.bid_count > 0 ? t('listing.currentBid') : t('listing.startingPrice'))
                    : t('listing.fixed')}
                </p>
                <p className="text-lg font-bold font-display text-foreground">
                  {t('common.eur')}{displayPrice?.toFixed(2)}
                </p>
              </div>
              {isAuction && listing.bid_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  {listing.bid_count} {t('listing.bids')}
                </span>
              )}
            </div>

            {isAuction && isActive && listing.auction_end && !hasEnded && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <AuctionTimer endDate={listing.auction_end} compact />
              </div>
            )}

            {listing.seller_email && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <Link
                  to={`/seller/${encodeURIComponent(listing.seller_email)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  <User className="w-3 h-3" />
                  <span className="truncate">{listing.seller_name || listing.seller_email.split('@')[0]}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}