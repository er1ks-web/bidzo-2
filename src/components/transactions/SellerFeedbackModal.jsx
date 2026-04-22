import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerFeedbackModal({ isOpen, onClose, transaction, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);

  const outcomes = [
    {
      id: 'completed',
      label: 'Buyer completed the deal',
      description: 'Transaction went smoothly',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 'unresponsive',
      label: 'Buyer unresponsive',
      description: 'No communication or payment received',
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      id: 'backed_out',
      label: 'Buyer backed out',
      description: 'Buyer refused to complete purchase',
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    }
  ];

  const handleSubmit = async () => {
    if (!selectedOutcome) return;

    setIsSubmitting(true);
    try {
      await base44.entities.AuctionTransaction.update(transaction.id, {
        seller_feedback_outcome: selectedOutcome,
        feedback_submitted_at: new Date().toISOString()
      });

      // If unresponsive or backed out, trigger buyer accountability check
      if (selectedOutcome !== 'completed') {
        await base44.functions.invoke('recordBuyerComplaint', {
          buyer_email: transaction.buyer_email,
          transaction_id: transaction.id,
          outcome: selectedOutcome
        });
      }

      toast.success('Feedback recorded');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to record feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border max-w-sm w-full p-6 space-y-4">
        <div>
          <h2 className="font-bold text-lg text-foreground">How did this transaction go?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your feedback helps us maintain trust in the marketplace.
          </p>
        </div>

        <div className="space-y-2">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon;
            const isSelected = selectedOutcome === outcome.id;

            return (
              <button
                key={outcome.id}
                onClick={() => setSelectedOutcome(outcome.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? `border-accent ${outcome.bgColor}`
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${outcome.color}`} />
                  <div>
                    <p className="font-medium text-sm">{outcome.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{outcome.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedOutcome || isSubmitting}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}