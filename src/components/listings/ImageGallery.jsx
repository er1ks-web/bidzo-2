import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import FullscreenImageViewer from './FullscreenImageViewer';
import { cn } from '@/lib/utils';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop';

export default function ImageGallery({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const displayImages = images.length > 0 ? images : [PLACEHOLDER];
  const hasMultiple = displayImages.length > 1;

  // Swipeable main image. Embla ignores the click that ends a drag, so a swipe never opens fullscreen.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: hasMultiple });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi]);

  const goToNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const goToPrevious = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);

  const openFullscreen = (index) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
  };

  // Returning from fullscreen lands on the photo the user was last looking at.
  const closeFullscreen = (lastIndex) => {
    setIsFullscreen(false);
    if (typeof lastIndex === 'number') emblaApi?.scrollTo(lastIndex, true);
  };

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {/* Main image - swipe to browse, tap for fullscreen */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted group">
          <div ref={emblaRef} className="h-full overflow-hidden cursor-pointer">
            <div className="flex h-full touch-pan-y">
              {displayImages.map((img, idx) => (
                <div key={idx} className="relative flex-[0_0_100%] min-w-0 h-full" onClick={() => openFullscreen(idx)}>
                  <img
                    src={img}
                    alt={`Listing image ${idx + 1}`}
                    draggable={false}
                    className="w-full h-full object-cover select-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fullscreen hint overlay (desktop hover) */}
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                Click to expand
              </div>
            </div>
          </div>

          {/* Image counter */}
          {hasMultiple && (
            <div className="pointer-events-none absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-lg text-xs font-medium">
              {currentIndex + 1} / {displayImages.length}
            </div>
          )}

          {/* Desktop navigation arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:flex items-center justify-center"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:flex items-center justify-center"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip -- padded so the selected thumbnail's border and scale-up aren't clipped by the scroll container */}
        {hasMultiple && (
          <div className="flex gap-2 overflow-x-auto p-1.5 -mx-1.5">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={cn(
                  'shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200',
                  currentIndex === idx
                    ? 'border-accent scale-105'
                    : 'border-transparent hover:border-muted-foreground/50'
                )}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      <FullscreenImageViewer
        images={displayImages}
        initialIndex={fullscreenIndex}
        isOpen={isFullscreen}
        onClose={closeFullscreen}
      />
    </>
  );
}
