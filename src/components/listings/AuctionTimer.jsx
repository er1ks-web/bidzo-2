import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuctionTimer({ endDate, compact = false }) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  function getTimeLeft() {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      total: diff,
    };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) {
    return (
      <span className="text-destructive font-medium text-sm">{t('time.ended')}</span>
    );
  }

  const isUrgent = timeLeft.total < 1000 * 60 * 60; // less than 1 hour

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-sm font-medium",
        isUrgent ? "text-destructive" : "text-muted-foreground"
      )}>
        {isUrgent ? <Flame className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        {timeLeft.days > 0 && <span>{timeLeft.days}{t('time.days')}</span>}
        <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3",
      isUrgent && "animate-pulse"
    )}>
      {[
        { value: timeLeft.days, label: t('time.days') },
        { value: timeLeft.hours, label: t('time.hours') },
        { value: timeLeft.minutes, label: t('time.minutes') },
        { value: timeLeft.seconds, label: t('time.seconds') },
      ].map(({ value, label }, i) => (
        <div key={i} className={cn(
          "flex flex-col items-center min-w-[3rem] p-2 rounded-lg",
          isUrgent ? "bg-destructive/10" : "bg-muted"
        )}>
          <span className={cn(
            "text-lg font-bold font-display",
            isUrgent ? "text-destructive" : "text-foreground"
          )}>
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}