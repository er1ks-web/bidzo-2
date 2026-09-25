import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n.jsx';
import { onForegroundPush } from '@/lib/push';

const VISIBLE_MS = 5000;

// Same mark as the app icon / favicon: black "B" on a yellow circle.
function BidzoMark() {
  return (
    <svg viewBox="0 0 32 32" className="w-9 h-9 shrink-0" aria-hidden="true">
      <circle cx="16" cy="16" r="15.36" fill="#FACC15" />
      <g transform="translate(16,16) scale(0.027143,-0.027143) translate(-334.00,-350.00)">
        <path
          fill="#0D0D0D"
          d="M46 0V116H138V584H46V700H406Q470 700 517.5 678.5Q565 657 591.5 617.5Q618 578 618 523V513Q618 465 600.0 434.5Q582 404 557.5 387.5Q533 371 511 364V346Q533 340 559.0 323.5Q585 307 603.5 276.0Q622 245 622 195V185Q622 127 595.0 85.5Q568 44 520.5 22.0Q473 0 410 0ZM270 120H394Q437 120 463.5 141.0Q490 162 490 201V211Q490 250 464.0 271.0Q438 292 394 292H270ZM270 412H392Q433 412 459.5 433.0Q486 454 486 491V501Q486 539 460.0 559.5Q434 580 392 580H270Z"
        />
      </g>
    </svg>
  );
}

// App-only: a push that arrives while Bidzo is open slides down from the top like a
// system notification (Android doesn't show one itself while the app is in front).
// Tap opens the page, swipe up dismisses, and it's skipped if you're already on that page.
export default function InAppNotificationBanner() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => onForegroundPush((notification) => {
    const here = locationRef.current.pathname + locationRef.current.search;
    if (notification.link && (notification.link === here || notification.link === locationRef.current.pathname)) return;
    setCurrent({ ...notification, id: Date.now() });
  }), []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const open = () => {
    const link = current?.link;
    setCurrent(null);
    if (link) navigate(link);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[130] pointer-events-none flex justify-center px-3 pt-2">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30 || info.velocity.y < -300) setCurrent(null);
            }}
            onClick={open}
            role="alert"
            className="pointer-events-auto w-full max-w-md flex items-start gap-3 p-3.5 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-2xl shadow-black/50 text-white cursor-pointer select-none"
          >
            <BidzoMark />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                <span className="font-semibold text-white/70">Bidzo</span>
                <span>·</span>
                <span>{t('in_app_notification.now')}</span>
              </div>
              <p className="font-bold text-sm leading-snug truncate">{current.title || 'Bidzo'}</p>
              {current.body && <p className="text-sm text-white/70 leading-snug line-clamp-2">{current.body}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
