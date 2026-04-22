import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/supabase'
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function WatchButton({ listingId, user, requireLogin, className, showCount = false, watcherCount = 0 }) {
  const [watchRecord, setWatchRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !listingId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .limit(1)

      if (error) console.log(error)
      setWatchRecord(Array.isArray(data) ? (data[0] || null) : null)
      setLoading(false)
    })().catch((error) => {
      console.log(error)
      setLoading(false)
    })
  }, [user, listingId]);

  const isWatching = !!watchRecord;

  const toggle = async () => {
    if (!user) { requireLogin('Log in to add items to your watchlist'); return; }
    setLoading(true);
    if (isWatching) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', watchRecord.id)

      if (error) console.log(error)
      setWatchRecord(null);
      toast.success('Removed from watchlist');
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          listing_id: listingId,
          notify_new_bid: true,
          notify_ending_soon: true,
          notify_auction_ended: true,
          ending_soon_notified: false,
        })
        .select('*')
        .single()

      if (error) console.log(error)
      setWatchRecord(data || null);
      toast.success('Added to watchlist — you\'ll get email updates!');
    }
    setLoading(false);
  };

  return (
    <Button
      variant={isWatching ? 'secondary' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={cn('gap-1.5', className)}
    >
      <Heart className={cn('w-4 h-4 transition-all', isWatching && 'fill-red-500 text-red-500')} />
      <span>{isWatching ? 'Watching' : 'Watch'}</span>
      {showCount && watcherCount > 0 && (
        <span className="text-muted-foreground text-xs ml-0.5">({watcherCount})</span>
      )}
    </Button>
  );
}