import { useState } from 'react';
import { Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

function ImageLightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  const prev = (e) => { e.stopPropagation(); setCurrent(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setCurrent(i => (i + 1) % images.length); };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image */}
      <img
        src={images[current]}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
        onClick={e => e.stopPropagation()}
      />

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={prev}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={next}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setCurrent(i); }}
                className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ReviewList({ reviews }) {
  const [lightbox, setLightbox] = useState(null); // { images, index }

  if (!reviews?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No reviews yet
      </div>
    );
  }

  return (
    <>
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="bg-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold">{review.reviewer_name || 'User'}</p>
                <p className="text-xs text-muted-foreground capitalize">{review.role_of_reviewer}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                ))}
              </div>
            </div>
            {review.review_text && (
              <p className="text-sm text-muted-foreground">{review.review_text}</p>
            )}
            {review.images?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {review.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox({ images: review.images, index: i })}
                    className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 hover:border-accent transition-all"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(review.created_date), 'MMM d, yyyy')}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}