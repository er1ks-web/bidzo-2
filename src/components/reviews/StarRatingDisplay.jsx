import { Star } from 'lucide-react';

export default function StarRatingDisplay({ rating, count, size = 'sm', showCount = true }) {
  if (!rating && !count) return null;
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const avg = rating ? parseFloat(rating).toFixed(1) : '—';

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className={`${sz} fill-accent text-accent shrink-0`} />
      <span className="font-semibold text-foreground">{avg}</span>
      {showCount && count != null && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </span>
  );
}