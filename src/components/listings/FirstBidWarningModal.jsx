import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FirstBidWarningModal({ isOpen, onConfirm, onCancel }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-destructive/30 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h2 className="font-bold text-lg text-foreground">Bidding is a commitment</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  By placing a bid, you confirm that you are prepared to complete the purchase if you win. Repeated unpaid or ignored winning bids may lead to account restrictions or suspension.
                </p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-2 text-sm text-muted-foreground">
              <p>• Only bid if you're willing and able to buy if you win</p>
              <p>• Winning bids are binding commitments</p>
              <p>• Repeatedly backing out may restrict your account</p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acknowledge"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 cursor-pointer"
              />
              <label htmlFor="acknowledge" className="text-sm cursor-pointer text-foreground">
                I understand and confirm that I am prepared to complete this purchase if I win
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                disabled={!isChecked}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => {
                  onConfirm();
                  setIsChecked(false);
                }}
              >
                Place Bid
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}