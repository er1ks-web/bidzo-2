import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export default function DeleteListingModal({ open, onOpenChange, onConfirm, loading, listingTitle }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                <p className="font-medium text-foreground mb-2">"{listingTitle}"</p>
                <p className="text-sm">This listing will no longer appear on the marketplace. This action cannot be undone.</p>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <div className="flex gap-3 pt-4">
          <AlertDialogCancel disabled={loading}>
            Keep Listing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {loading ? 'Deleting...' : 'Delete Listing'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}