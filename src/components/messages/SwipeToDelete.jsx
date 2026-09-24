import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const ACTION_WIDTH = 88;
// Swiping further than this share of the row (or flicking hard) goes straight to the delete confirmation.
const FULL_SWIPE_RATIO = 0.55;
const FLICK_VELOCITY = -900;
const SPRING = { type: 'spring', stiffness: 500, damping: 40 };

// A list row that slides left to reveal a red Delete action, like mail/chat apps.
// isOpen/onOpenChange are controlled by the parent so only one row is open at a time;
// isDeleting holds the row slid fully off to the left while the delete confirmation is up.
export default function SwipeToDelete({ isOpen, isDeleting, onOpenChange, onDelete, deleteLabel, children }) {
  const rowRef = useRef(null);
  const didDrag = useRef(false);
  const x = useMotionValue(0);

  // The trash icon grows as you pull, and pops a little past the action width.
  const iconScale = useTransform(x, [-ACTION_WIDTH * 2, -ACTION_WIDTH, -20, 0], [1.3, 1, 0.5, 0.5]);
  const actionOpacity = useTransform(x, [-ACTION_WIDTH * 0.8, -8, 0], [1, 0.3, 0]);

  useEffect(() => {
    const width = rowRef.current?.offsetWidth || 320;
    animate(x, isDeleting ? -width : isOpen ? -ACTION_WIDTH : 0, SPRING);
  }, [isOpen, isDeleting, x]);

  const handleDragEnd = (_, info) => {
    const width = rowRef.current?.offsetWidth || 320;
    const offset = x.get();
    if (offset < -width * FULL_SWIPE_RATIO || (info.velocity.x < FLICK_VELOCITY && offset < -ACTION_WIDTH / 2)) {
      onDelete();
    } else if (offset < -ACTION_WIDTH / 2) {
      onOpenChange(true);
      animate(x, -ACTION_WIDTH, SPRING);
    } else {
      onOpenChange(false);
      animate(x, 0, SPRING);
    }
  };

  return (
    <div ref={rowRef} className="relative overflow-hidden">
      <motion.button
        type="button"
        onClick={onDelete}
        style={{ opacity: actionOpacity }}
        className="absolute inset-0 bg-destructive flex items-center justify-end text-white"
        aria-label={deleteLabel}
      >
        <motion.span style={{ scale: iconScale, width: ACTION_WIDTH }} className="flex flex-col items-center gap-1 text-[11px] font-semibold">
          <Trash2 className="w-5 h-5" />
          {deleteLabel}
        </motion.span>
      </motion.button>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -10000, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        onPointerDown={() => { didDrag.current = false; }}
        onDragStart={() => { didDrag.current = true; }}
        onDragEnd={handleDragEnd}
        // A drag shouldn't also open the chat, and tapping an open row just closes it.
        onClickCapture={(e) => {
          if (didDrag.current || isOpen) {
            e.stopPropagation();
            e.preventDefault();
            didDrag.current = false;
            if (isOpen) onOpenChange(false);
          }
        }}
        style={{ x, touchAction: 'pan-y' }}
        className="relative bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}
