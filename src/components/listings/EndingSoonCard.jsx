import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Flame, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop',
];

function getTimeLeft(endDate) {
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return null;
  return {
    total: diff,
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function EndingSoonCard({ listing, index = 0, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(listing.auction_end));

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = getTimeLeft(listing.auction_end);
      setTimeLeft(tl);
      if (!tl) onExpired?.(listing.id);
    }, 1000);
    return () => clearInterval(interval);
  }, [listing.auction_end, listing.id, onExpired]);

  if (!timeLeft) return null;

  const isFinalMinute = timeLeft.total < 60 * 1000;
  const isFinalTwoMin = timeLeft.total < 2 * 60 * 1000;
  const imageUrl = listing.images?.[0] || PLACEHOLDER_IMAGES[index % 3];
  const displayPrice = listing.current_bid || listing.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-card rounded-xl border overflow-hidden flex flex-col transition-all duration-300 ${
        isFinalMinute ? 'border-red-400 shadow-red-100 shadow-md' : isFinalTwoMin ? 'border-orange-300' : 'border-border/50'
      }`}
    >
      {/* Image */}
      <Link to={`/listing/${listing.id}`} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
        {/* Timer badge overlay */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${
          isFinalMinute
            ? 'bg-red-600 text-white animate-pulse'
            : isFinalTwoMin
            ? 'bg-orange-500 text-white'
            : 'bg-primary text-primary-foreground'
        }`}>
          {isFinalMinute ? <Flame className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {isFinalMinute ? 'Final minute!' : `${String(timeLeft.minutes).padStart(2,'0')}:${String(timeLeft.seconds).padStart(2,'0')}`}
        </div>
        {listing.featured && (
          <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground shadow">★</Badge>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <Link to={`/listing/${listing.id}`}>
            <h3 className="font-semibold text-sm leading-tight hover:text-accent transition-colors line-clamp-2">
              {listing.title}
            </h3>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{listing.bid_count > 0 ? 'Current bid' : 'Starting price'}</p>
            <p className="text-lg font-bold font-display">€{displayPrice?.toFixed(2)}</p>
          </div>
          {listing.bid_count > 0 && (
            <span className="text-xs text-muted-foreground">{listing.bid_count} bid{listing.bid_count !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Countdown bar */}
        <div className="space-y-1.5">
          <div className={`text-xs font-semibold flex items-center gap-1 ${
            isFinalMinute ? 'text-red-600' : isFinalTwoMin ? 'text-orange-500' : 'text-muted-foreground'
          }`}>
            {isFinalMinute ? <Flame className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isFinalMinute
              ? `Final minute — ${String(timeLeft.seconds)}s left!`
              : `Ending in ${timeLeft.minutes}m ${String(timeLeft.seconds).padStart(2,'0')}s`
            }
          </div>
        </div>

        <Link to={`/listing/${listing.id}`} className="mt-auto">
          <Button
            size="sm"
            className={`w-full gap-2 font-semibold ${
              isFinalMinute
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-accent hover:bg-accent/90 text-accent-foreground'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            Place Bid
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}