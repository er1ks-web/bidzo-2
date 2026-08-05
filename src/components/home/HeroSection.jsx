import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Button } from '@/components/ui/button';
import { ArrowRight, Gavel, Clock, TrendingUp, Tag, ShieldCheck, Bell, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import AuctionTimer from '@/components/listings/AuctionTimer';

const PLACEHOLDER_IMAGES = [
'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80',
'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80'];


function HeroAuctionCard({ listing, index }) {
  const { t } = useI18n();
  const isEuroStart = listing.price <= 1 && !listing.current_bid;
  const currentPrice = listing.current_bid || listing.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.15, duration: 0.4 }}>
      
      <Link
        to={`/listing/${listing.id}`}
        className="block bg-card/40 backdrop-blur-md border border-border/60 shadow-lg shadow-black/20 rounded-xl overflow-hidden hover:shadow-md hover:border-accent/40 transition-all duration-200 hover:scale-[1.02]">
        
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={listing.images?.[0] || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]}
            alt={listing.title}
            className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-2 left-2 flex gap-1.5">
            {isEuroStart &&
            <span className="bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                🔥 €1
              </span>
            }
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
              {t('hero_card.live')}
            </span>
          </div>
          {listing.bid_count > 0 &&
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              {listing.bid_count} bids
            </div>
          }
        </div>

        <div className="p-2">
          <p className="text-foreground font-medium text-xs leading-tight line-clamp-1 mb-1">{listing.title}</p>
          <div className="flex items-center justify-between gap-1">
            <div>
              <p className="text-foreground/50 text-[9px] uppercase tracking-wide mb-0.5">
                {listing.current_bid ? t('hero_card.currentBid') : t('hero_card.startsAt')}
              </p>
              <p className="text-accent font-bold text-sm font-display">€{currentPrice?.toFixed(2)}</p>
            </div>
            {listing.auction_end &&
            <div className="text-right">
                <div className="flex items-center gap-0.5 text-foreground/50 text-[9px] mb-0.5">
                   <Clock className="w-2 h-2" />
                   <span>{t('hero_card.endsIn')}</span>
                 </div>
                <AuctionTimer endDate={listing.auction_end} compact />
              </div>
            }
          </div>
        </div>
      </Link>
    </motion.div>);

}


const VALUE_PROP_ICONS = [Tag, ShieldCheck, Bell];

export default function HeroSection({ liveListings = [] }) {
  const { t } = useI18n();
  const valueProps = t('hero.valueProps') || [];

  const previewListings = [...liveListings]
    .filter((l) => l.listing_type === 'auction' && l.status === 'active' && l.auction_end && new Date(l.auction_end) > new Date())
    .sort((a, b) => new Date(a.auction_end) - new Date(b.auction_end))
    .slice(0, 4);

  return (
    <section className="relative overflow-hidden text-foreground sm:min-h-[calc(100vh-65px)] flex flex-col justify-center">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20 sm:pt-12 sm:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1 mb-5">
              
              <span className="bg-[#f84f4f] rounded-full w-2 h-2 animate-pulse" />
              <span className="text-xs font-semibold text-foreground/70">{t('hero.liveBadge')}</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight">
              {t('hero.title')}
            </h1>

            <p className="mt-4 text-lg text-foreground/60 max-w-md">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/create">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2">
                  <Gavel className="w-4 h-4" />
                  {t('hero.cta')}
                </Button>
              </Link>
              <Link to="/browse?type=auction">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground bg-transparent hover:bg-muted font-semibold gap-2">
                  
                  {t('hero.browse')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-xl">
              {valueProps.map((vp, i) => {
                const Icon = VALUE_PROP_ICONS[i] || Tag;
                return (
                  <motion.div
                    key={vp.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                    className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-display font-semibold leading-tight">{vp.title}</p>
                      <p className="hidden sm:block text-xs text-foreground/50 leading-snug mt-0.5">{vp.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <div className="hidden lg:grid grid-cols-2 gap-2">
            {previewListings.length > 0 ?
            previewListings.map((listing, i) =>
            <HeroAuctionCard key={listing.id} listing={listing} index={i} />
            ) :
            [0, 1, 2, 3].map((i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-card border border-border rounded-xl p-3 flex gap-2 items-center">
              <div className="w-10 h-10 rounded-lg bg-muted shrink-0 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-2.5 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            </motion.div>
            )
            }
          </div>

        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="hidden sm:block absolute bottom-6 left-1/2 -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown className="w-8 h-8 text-accent" strokeWidth={2.5} />
        </motion.div>
      </motion.div>
    </section>);

}