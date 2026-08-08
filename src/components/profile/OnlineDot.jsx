import { isOnline } from '@/lib/presence';
import { cn } from '@/lib/utils';

// Overlay on a `relative`-positioned avatar wrapper. Renders nothing when
// the user isn't currently considered online (see lib/presence.js).
export default function OnlineDot({ lastSeenAt, className }) {
  if (!isOnline(lastSeenAt)) return null;
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background',
        className
      )}
    />
  );
}
