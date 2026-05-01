import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ExternalLink, CheckCircle2, Clock, Package, Truck, Star, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase'
import ReviewForm from '@/components/reviews/ReviewForm';

const STATUS_CONFIG = {
  sold_pending: { label: 'Awaiting Confirmation', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  buyer_confirmed: { label: 'Buyer Confirmed', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle2 },
  seller_confirmed: { label: 'Seller Confirmed', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: 'bg-accent/20 text-accent', icon: Truck },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/20 text-destructive', icon: Clock },
};

export default function TransactionCard({ transaction, currentUserEmail, onConfirm, onComplete, onMarkShipped, confirmLoading }) {
  const isBuyer = currentUserEmail === transaction.buyer_email;
  const isSeller = currentUserEmail === transaction.seller_email;
  const cfg = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.sold_pending;
  const StatusIcon = cfg.icon;
  const isCompleted = transaction.status === 'completed';

  const currentUserId = isBuyer ? transaction.buyer_id : transaction.seller_id;
  const otherPartyId = isBuyer ? transaction.seller_id : transaction.buyer_id;

  const bothConfirmed = transaction.buyer_confirmed && transaction.seller_confirmed;
  const canBuyerConfirm = isBuyer && !transaction.buyer_confirmed && !isCompleted && transaction.status !== 'cancelled';
  const canSellerConfirm = isSeller && !transaction.seller_confirmed && !isCompleted && transaction.status !== 'cancelled';
  const canMarkShipped = isSeller && bothConfirmed && !transaction.shipped && !isCompleted && transaction.status !== 'cancelled';
  const canMarkReceived = isBuyer && bothConfirmed && transaction.shipped && !isCompleted && transaction.status !== 'cancelled';
  const otherPartyEmail = isBuyer ? transaction.seller_email : transaction.buyer_email;
  const otherPartyName = isBuyer ? transaction.seller_name : transaction.buyer_name;
  const convId = transaction.conversation_id || [transaction.buyer_email, transaction.seller_email].sort().join('_');
  const roleOfReviewer = isBuyer ? 'buyer' : 'seller';

  const queryClient = useQueryClient();

  const { data: existingReview } = useQuery({
    queryKey: ['my-review', transaction.id, currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('transaction_id', transaction.id)
        .eq('reviewer_id', currentUserId)
        .limit(1)

      if (error) console.log(error)
      const row = Array.isArray(data) ? (data[0] || null) : null
      if (!row) return null

      let parsedImages = []
      try {
        if (typeof row.images === 'string' && row.images.trim()) {
          const val = JSON.parse(row.images)
          if (Array.isArray(val)) parsedImages = val
        } else if (Array.isArray(row.images)) {
          parsedImages = row.images
        }
      } catch (e) {
        parsedImages = []
      }

      return {
        ...row,
        images: parsedImages,
        created_date: row.created_date || row.created_at,
      }
    },
    enabled: isCompleted && (isBuyer || isSeller),
  });

  const handleReviewSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['my-review', transaction.id, currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['user-rating', otherPartyId] });
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Image */}
        {transaction.listing_image ? (
          <img
            src={transaction.listing_image}
            alt={transaction.listing_title}
            className="w-20 h-20 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{transaction.listing_title}</h3>
            <Badge className={cn('text-xs shrink-0 gap-1', cfg.color)}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </Badge>
          </div>

          <p className="text-xl font-display font-bold text-accent mt-1">
            €{transaction.winning_amount?.toFixed(2)}
          </p>

          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            <p>
              {isBuyer ? 'Seller: ' : 'Buyer: '}
              <Link
                to={`/seller/${encodeURIComponent(isBuyer ? transaction.seller_email : transaction.buyer_email)}`}
                className="text-accent hover:underline font-medium"
              >
                {isBuyer ? transaction.seller_name : transaction.buyer_name}
              </Link>
            </p>
            <p>Ended {format(new Date(transaction.created_date), 'MMM d, yyyy')}</p>
          </div>

          {/* Shipping info — shown when shipped */}
          {transaction.shipped && transaction.shipping_info && (
            <div className="mt-2 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-blue-400 font-semibold mb-0.5">Shipping Info</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{transaction.shipping_info}</p>
              </div>
            </div>
          )}

          {/* 4-step progress pills */}
          {!isCompleted && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full', transaction.buyer_confirmed ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                {transaction.buyer_confirmed ? '✓ Buyer confirmed' : '○ Buyer pending'}
              </span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full', transaction.seller_confirmed ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                {transaction.seller_confirmed ? '✓ Seller confirmed' : '○ Seller pending'}
              </span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full', transaction.shipped ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground')}>
                {transaction.shipped ? '✓ Shipped' : '○ Not shipped'}
              </span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground')}>
                ○ Received
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t px-4 py-3 flex flex-wrap gap-2">
        <Link
          to={`/messages?conv=${convId}&to=${otherPartyEmail}&toName=${encodeURIComponent(otherPartyName)}`}
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full gap-2">
            <MessageSquare className="w-4 h-4" />
            Message
          </Button>
        </Link>

        <Link to={`/listing/${transaction.listing_id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <ExternalLink className="w-4 h-4" />
            View Listing
          </Button>
        </Link>

        {(canBuyerConfirm || canSellerConfirm) && (
          <Button
            size="sm"
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            onClick={() => onConfirm(transaction)}
            disabled={confirmLoading === transaction.id}
          >
            <CheckCircle2 className="w-4 h-4" />
            {canBuyerConfirm ? 'Confirm Purchase' : 'Confirm Sale'}
          </Button>
        )}

        {canMarkShipped && (
          <Button
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={() => onMarkShipped(transaction)}
            disabled={confirmLoading === transaction.id}
          >
            <Truck className="w-4 h-4" />
            Mark as Shipped
          </Button>
        )}

        {canMarkReceived && (
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => onComplete(transaction)}
            disabled={confirmLoading === transaction.id}
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark as Received
          </Button>
        )}
      </div>

      {/* Review section — only for completed transactions */}
      {isCompleted && (isBuyer || isSeller) && (
        <div className="border-t px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">Leave a Review</span>
          </div>
          <ReviewForm
            transaction={transaction}
            currentUser={{ id: currentUserId, email: currentUserEmail, full_name: isBuyer ? transaction.buyer_name : transaction.seller_name }}
            targetId={otherPartyId}
            targetEmail={otherPartyEmail}
            targetName={otherPartyName}
            roleOfReviewer={roleOfReviewer}
            existingReview={existingReview}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>
      )}
    </div>
  );
}