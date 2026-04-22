import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Truck } from 'lucide-react';

export default function MarkShippedModal({ open, onClose, onConfirm, loading }) {
  const [shippingInfo, setShippingInfo] = useState('');

  const handleConfirm = () => {
    onConfirm(shippingInfo.trim() || null);
    setShippingInfo('');
  };

  const handleClose = () => {
    setShippingInfo('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Mark as Shipped
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            Optionally add a tracking code or any shipping details for the buyer. You can leave this blank.
          </p>
          <Textarea
            placeholder="e.g. DPD tracking: 1234567890, or 'Sent via post, arrives in 3-5 days'"
            value={shippingInfo}
            onChange={e => setShippingInfo(e.target.value)}
            className="min-h-[100px] resize-none text-sm"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{shippingInfo.length}/500</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Truck className="w-4 h-4" />
            {loading ? 'Marking...' : 'Confirm Shipped'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}