import { AlertCircle, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function BidRestrictionAlert({ restrictionType, restrictionEndDate, strikeCount }) {
  if (restrictionType === 'none') return null;

  const isPermanent = restrictionType === 'permanent';
  const endDate = restrictionEndDate ? new Date(restrictionEndDate) : null;
  const isActive = isPermanent || (endDate && endDate > new Date());

  if (!isActive) return null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3 mb-4">
      <Lock className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm text-destructive">Bidding temporarily restricted</p>
        <p className="text-xs text-muted-foreground mt-1">
          {isPermanent
            ? `Your account has been permanently restricted due to repeated incomplete auction wins (${strikeCount} strikes).`
            : `Your bidding access is temporarily restricted until ${format(endDate, 'MMM d, yyyy')} due to incomplete auction wins.`}
        </p>
        {!isPermanent && (
          <p className="text-xs text-muted-foreground mt-2">
            Complete your pending purchases to improve your account status.
          </p>
        )}
      </div>
    </div>
  );
}