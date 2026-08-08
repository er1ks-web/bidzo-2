import { useState, useEffect } from 'react';
import { supabase } from '@/supabase'
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Gavel, MapPin, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuctionTimer from '@/components/listings/AuctionTimer';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n.jsx';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop';

export default function Favourites() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.log(error)

      const authUser = data?.user
      if (!authUser) return

      setUser({
        id: authUser.id,
        email: authUser.email,
      })
    })().catch(() => {})
  }, []);

  const { data: watches = [], refetch: refetchWatches } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)

      if (error) console.log(error)
      return Array.isArray(data) ? data : []
    },
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['watchlist-listings', watches.map(w => w.listing_id).join(',')],
    queryFn: async () => {
      if (!watches.length) return [];
      const ids = watches.map(w => w.listing_id).filter(Boolean)
      if (ids.length === 0) return []

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .in('id', ids)

      if (error) console.log(error)
      const rows = Array.isArray(data) ? data : []
      const now = new Date()
      return rows
        .filter(l => l && !l.is_deleted)
        .filter(l => !(l?.listing_type === 'auction' && l?.auction_end && new Date(l.auction_end) < now));
    },
    enabled: watches.length > 0,
  });

  // Sort by ending soonest first (auctions), then fixed price
  const sorted = [...listings].sort((a, b) => {
    if (a.auction_end && b.auction_end) return new Date(a.auction_end) - new Date(b.auction_end);
    if (a.auction_end) return -1;
    if (b.auction_end) return 1;
    return 0;
  });

  const getWatch = (listingId) => watches.find(w => w.listing_id === listingId);

  const handleRemove = async (listingId) => {
    const watch = getWatch(listingId);
    if (!watch) return;
    setRemovingId(listingId);
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', watch.id)

    if (error) {
      console.log(error)
      toast.error(t('favourites_extra.removeFailed'))
    } else {
      toast.success(t('favourites_extra.removed'));
      await refetchWatches();
    }
    setRemovingId(null);
  };

  const handleToggleNotif = async (listingId, field) => {
    const watch = getWatch(listingId);
    if (!watch) return;
    const { error } = await supabase
      .from('favorites')
      .update({ [field]: !watch[field] })
      .eq('id', watch.id)

    if (error) {
      console.log(error)
      toast.error(t('favourites_extra.notifUpdateFailed'))
      return
    }
    await refetchWatches();
  };

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium">{t('favourites_extra.loginPrompt')}</p>
      </div>
    );
  }

  return (
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-display font-bold">{t('nav.watchlist')}</h1>
        {sorted.length > 0 && (
          <Badge variant="outline" className="ml-1">{sorted.length}</Badge>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">{t('favourites_extra.emptyTitle')}</p>
          <p className="text-sm mt-1">{t('favourites_extra.emptySubtitle')}</p>
          <Link to="/browse">
            <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">{t('favourites_extra.browseListings')}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {sorted.map((listing) => {
              const watch = getWatch(listing.id);
              const isAuction = listing.listing_type === 'auction';
              const hasEnded = isAuction && listing.auction_end && new Date(listing.auction_end) < new Date();
              const displayPrice = isAuction ? (listing.current_bid || listing.price) : listing.price;
              const imageUrl = listing.images?.[0] || PLACEHOLDER;

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-card border rounded-xl overflow-hidden"
                >
                  <div className="flex gap-0">
                    {/* Image */}
                    <Link to={`/listing/${listing.id}`} className="shrink-0 w-28 sm:w-40">
                      <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover aspect-square" />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link to={`/listing/${listing.id}`}>
                            <h3 className="font-semibold text-sm sm:text-base hover:text-accent transition-colors truncate">
                              {listing.title}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{listing.location ? t(`locations.${listing.location}`) : ''}</span>
                            <span>·</span>
                            <span>{isAuction ? t('listing.auction') : t('listing.fixed')}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
                          disabled={removingId === listing.id}
                          onClick={() => handleRemove(listing.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">{isAuction && listing.bid_count > 0 ? t('hero_card.currentBid') : t('favourites_extra.price')}</p>
                          <p className="font-bold text-base font-display">€{displayPrice?.toFixed(2)}</p>
                        </div>
                        {isAuction && (
                          <span className="text-xs text-muted-foreground">{listing.bid_count || 0} {t('listing.bids')}</span>
                        )}
                        {listing.status !== 'active' && (
                          <Badge variant="outline" className="text-xs">
                            {listing.status === 'sold' ? t('listing.sold')
                              : listing.status === 'cancelled' ? t('favourites_extra.statusCancelled')
                              : listing.status}
                          </Badge>
                        )}
                      </div>

                      {/* Timer */}
                      {isAuction && listing.auction_end && !hasEnded && listing.status === 'active' && (
                        <AuctionTimer endDate={listing.auction_end} compact />
                      )}
                      {hasEnded && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t('favourites_extra.auctionEnded')}
                        </span>
                      )}


                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
    </div>
  );
}