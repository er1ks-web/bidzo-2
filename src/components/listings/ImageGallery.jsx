import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import FullscreenImageViewer from './FullscreenImageViewer';
import { cn } from '@/lib/utils';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop';

export default function ImageGallery({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const displayImages = images.length > 0 ? images : [PLACEHOLDER];
  const currentImage = displayImages[currentIndex];
  const hasMultiple = displayImages.length > 1;

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const openFullscreen = (index) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {/* Main image - clickable for fullscreen */}
        <div
          className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted cursor-pointer group"
          onClick={() => openFullscreen(currentIndex)}
        >
          <motion.img
            key={currentImage}
            src={currentImage}
            alt={`Listing image ${currentIndex + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Fullscreen hint overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                Click to expand
              </div>
            </div>
          </div>

          {/* Image counter */}
          {hasMultiple && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-lg text-xs font-medium">
              {currentIndex + 1} / {displayImages.length}
            </div>
          )}

          {/* Desktop navigation arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:flex items-center justify-center"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:flex items-center justify-center"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {hasMultiple && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => handleThumbnailClick(idx)}
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
        onClose={() => setIsFullscreen(false)}
      />
    </>
  );
}