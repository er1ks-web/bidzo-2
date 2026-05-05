import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X } from 'lucide-react';

export default function ReportSuccessSheet({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-6 sm:pb-8"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-accent/20 shadow-2xl"
              style={{ background: '#1A1A1A' }}
            >
              <div className="relative px-6 py-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Flag className="w-5 h-5 text-accent" />
                  </div>

                  <div>
                    <p className="font-bold text-base text-white leading-tight">
                      Report submitted
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="text-accent font-semibold">Thanks</span> for helping keep Bidzo safe.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <motion.div
                className="h-0.5 bg-accent/40"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
