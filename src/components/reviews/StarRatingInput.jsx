import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRatingInput({ value, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`${sz} transition-colors ${filled ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
            />
          </button>
        );
      })}
    </div>
  );
}