import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;

const clampNum = (v, min, max) => Math.min(max, Math.max(min, v));
const touchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

// One photo that can be pinch-zoomed, dragged around while zoomed, and
// double-tapped (or double-clicked / mouse-wheeled on desktop) to zoom.
function ZoomableImage({ src, alt, onZoomChange }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [animated, setAnimated] = useState(false);
  const current = useRef(transform);
  const gesture = useRef(null);
  const tap = useRef({ time: 0, x: 0, y: 0, moved: false });

  const apply = useCallback((next, withAnimation) => {
    const el = containerRef.current;
    const scale = clampNum(next.scale, 1, MAX_SCALE);
    // Don't let the photo be dragged further than its zoomed-in edges.
    const maxX = el ? (el.clientWidth * (scale - 1)) / 2 : 0;
    const maxY = el ? (el.clientHeight * (scale - 1)) / 2 : 0;
    const clamped = {
      scale,
      x: scale === 1 ? 0 : clampNum(next.x, -maxX, maxX),
      y: scale === 1 ? 0 : clampNum(next.y, -maxY, maxY),
    };
    current.current = clamped;
    setAnimated(withAnimation);
    setTransform(clamped);
    onZoomChange?.(clamped.scale > 1.01);
  }, [onZoomChange]);

  // Zoom in on the tapped point, or back out if already zoomed.
  const toggleZoom = (clientX, clientY) => {
    if (current.current.scale > 1.01) {
      apply({ scale: 1, x: 0, y: 0 }, true);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - (rect.left + rect.width / 2);
    const offsetY = clientY - (rect.top + rect.height / 2);
    apply({ scale: DOUBLE_TAP_SCALE, x: -offsetX * (DOUBLE_TAP_SCALE - 1), y: -offsetY * (DOUBLE_TAP_SCALE - 1) }, true);
  };

  const onTouchStart = (e) => {
    const t = current.current;
    if (e.touches.length === 2) {
      gesture.current = { type: 'pinch', distance: touchDistance(e.touches[0], e.touches[1]), ...t };
      tap.current.moved = true;
    } else if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0];
      tap.current = { ...tap.current, x: clientX, y: clientY, moved: false };
      gesture.current = t.scale > 1.01 ? { type: 'pan', startX: clientX, startY: clientY, ...t } : null;
    }
  };

  const onTouchMove = (e) => {
    const g = gesture.current;
    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0];
      if (Math.hypot(clientX - tap.current.x, clientY - tap.current.y) > TAP_SLOP_PX) tap.current.moved = true;
    }
    if (!g) return;
    if (g.type === 'pinch' && e.touches.length === 2) {
      const scale = clampNum(g.scale * (touchDistance(e.touches[0], e.touches[1]) / g.distance), 1, MAX_SCALE);
      const ratio = scale / g.scale;
      apply({ scale, x: g.x * ratio, y: g.y * ratio }, false);
    } else if (g.type === 'pan' && e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0];
      apply({ scale: g.scale, x: g.x + (clientX - g.startX), y: g.y + (clientY - g.startY) }, false);
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length > 0) {
      // Lifted one finger of a pinch: carry on as a pan with the remaining one.
      if (current.current.scale > 1.01) {
        const { clientX, clientY } = e.touches[0];
        gesture.current = { type: 'pan', startX: clientX, startY: clientY, ...current.current };
      }
      return;
    }
    gesture.current = null;
    if (current.current.scale < 1.05) apply({ scale: 1, x: 0, y: 0 }, true);

    if (!tap.current.moved && e.changedTouches.length === 1) {
      const now = Date.now();
      if (now - tap.current.time < DOUBLE_TAP_MS) {
        toggleZoom(tap.current.x, tap.current.y);
        tap.current.time = 0;
      } else {
        tap.current.time = now;
      }
    }
  };

  const onWheel = (e) => {
    const t = current.current;
    const scale = clampNum(t.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, MAX_SCALE);
    apply({ scale, x: t.x * (scale / t.scale), y: t.y * (scale / t.scale) }, false);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={(e) => toggleZoom(e.clientX, e.clientY)}
      onWheel={onWheel}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-[90vh] max-w-[92vw] object-contain select-none"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transition: animated ? 'transform 200ms ease-out' : 'none',
          cursor: transform.scale > 1.01 ? 'grab' : 'zoom-in',
        }}
      />
    </div>
  );
}

// onClose receives the index of the photo that was showing, so the caller can stay on it.
export default function FullscreenImageViewer({ images, initialIndex = 0, isOpen, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);
  const indexRef = useRef(initialIndex);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // While zoomed in, one-finger drags pan the photo instead of switching photos.
  // Memoised: embla re-initialises (and jumps back to startIndex) whenever its options change.
  const emblaOptions = useMemo(() => ({
    loop: images.length > 1,
    startIndex: initialIndex,
    watchDrag: () => !zoomedRef.current,
  }), [images.length, initialIndex]);
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const handleZoomChange = useCallback((isZoomed) => {
    zoomedRef.current = isZoomed;
    setZoomed(isZoomed);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      indexRef.current = i;
      setIndex(i);
      zoomedRef.current = false;
      setZoomed(false);
    };
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi]);

  useEffect(() => {
    if (!isOpen) return;
    indexRef.current = initialIndex;
    setIndex(initialIndex);
    emblaApi?.scrollTo(initialIndex, true);
  }, [isOpen, initialIndex, emblaApi]);

  // The phone's back button / back gesture closes the viewer instead of leaving the page:
  // opening adds a history entry, and going back (from anywhere) closes the viewer.
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ ...window.history.state, bidzoViewer: true }, '');
    const onPop = () => onCloseRef.current(indexRef.current);
    window.addEventListener('popstate', onPop);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const close = useCallback(() => {
    if (window.history.state?.bidzoViewer) window.history.back();
    else onCloseRef.current(indexRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, emblaApi, close]);

  if (!images.length) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/95"
        >
          <div ref={emblaRef} className="h-full overflow-hidden">
            <div className="flex h-full">
              {images.map((img, idx) => (
                <div key={idx} className="flex-[0_0_100%] min-w-0 h-full">
                  {/* Remount per visit so a photo you swiped away from comes back un-zoomed. */}
                  <ZoomableImage
                    key={idx === index ? `active-${idx}` : `idle-${idx}`}
                    src={img}
                    alt={`Image ${idx + 1}`}
                    onZoomChange={idx === index ? handleZoomChange : undefined}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image count indicator */}
          {images.length > 1 && (
            <div className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 rounded-lg text-sm font-medium">
              {index + 1} / {images.length}
            </div>
          )}

          {/* Navigation arrows - desktop only */}
          {images.length > 1 && !zoomed && (
            <>
              <button
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:block"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() => emblaApi?.scrollNext()}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors hidden sm:block"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
