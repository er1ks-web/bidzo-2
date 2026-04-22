import { useState } from 'react';
import { Share2, Check, Copy, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ShareButton({ listing, className }) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => window.location.href;

  const getShareData = () => ({
    title: listing?.title || 'Auction listing',
    text: listing?.current_bid
      ? `${listing.title} — Current bid: €${listing.current_bid?.toFixed(2)}`
      : `${listing?.title} — Starting at €${listing?.price?.toFixed(2)}`,
    url: getShareUrl(),
  });

  const handleShare = async () => {
    const shareData = getShareData();

    // Use native share if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or not supported — fall through to copy
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className={cn('gap-2', className)}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-green-600 font-medium">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          Share
        </>
      )}
    </Button>
  );
}