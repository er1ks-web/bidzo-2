import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';

function useCountdown(endDate) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else if (m > 0) setTimeLeft(`${m}m ${s}s`);
      else setTimeLeft(`${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return timeLeft;
}

function MiniConfetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = Array.from({ length: 28 }, () => ({
      x: canvas.width * (0.3 + Math.random() * 0.4),
      y: canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: -(Math.random() * 4 + 2),
      size: Math.random() * 3 + 1.5,
      color: ['#F5C518', '#FFFFFF', '#888888', '#C0A000'][Math.floor(Math.random() * 4)],
      alpha: 1,
      gravity: 0.12,
    }));

    let frame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.022;
        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (alive) frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

export default function BidSuccessSheet({ isOpen, onClose, auctionEnd }) {
  const timeLeft = useCountdown(auctionEnd);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — very subtle, doesn't block the page */}
          <motion.div
            className="fixed inset-0 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Bottom sheet */}
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
              {/* Confetti canvas */}
              <MiniConfetti active={isOpen} />

              {/* Content */}
              <div className="relative px-6 py-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Trophy className="w-5 h-5 text-accent" />
                  </div>

                  <div>
                    <p className="font-bold text-base text-white leading-tight">
                      You're now the highest bidder
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Auction ends in{' '}
                      <span className="text-accent font-semibold">{timeLeft}</span>
                    </p>
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar — auto-dismiss indicator */}
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