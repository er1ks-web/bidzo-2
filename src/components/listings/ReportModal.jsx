import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/supabase';
import { toast } from 'sonner';
import ReportSuccessSheet from '@/components/listings/ReportSuccessSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Flag } from 'lucide-react';

export default function ReportModal({
  listing,
  triggerClassName = '',
  triggerSize = 'sm',
  sellerName: sellerNameOverride = null,
  sellerEmail: sellerEmailOverride = null,
}) {
  const { requireLogin } = useAuth();
  const [reportDetails, setReportDetails] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);

  const handleReport = async () => {
    console.log('[ReportModal] Submit clicked', {
      listingId: listing?.id,
      open,
      submitting,
      detailsLength: (reportDetails || '').length,
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) console.error('[ReportModal] supabase.auth.getUser() error', userError);
    const authUser = userData?.user;

    console.log('[ReportModal] Auth user', {
      hasUser: !!authUser,
      userId: authUser?.id,
      email: authUser?.email,
    });

    if (!authUser) {
      requireLogin('Log in to report listings');
      return;
    }

    const sellerEmail = sellerEmailOverride || listing.seller_email || null;
    const sellerName = sellerNameOverride || listing.seller_name || (sellerEmail ? sellerEmail.split('@')[0] : 'Seller');
    const reporterEmail = authUser.email;
    const listingTitle = listing.title;
    const listingUrl = window.location.href;

    setSubmitting(true);
    try {
      const basePayload = {
        listing_id: listing.id,
        reporter_id: authUser.id,
        reason: 'other',
        details: reportDetails || null,
        status: 'pending',
      };

      console.log('[ReportModal] basePayload prepared', basePayload);

      const extendedPayload = {
        ...basePayload,
        reporter_email: reporterEmail,
        seller_id: listing.seller_id || null,
        seller_email: sellerEmail,
        seller_name: sellerName,
        listing_title: listingTitle,
        listing_category: listing.category || null,
        listing_subcategory: listing.subcategory || null,
        listing_url: listingUrl,
      };

      let insertErr = null;
      {
        console.log('[ReportModal] inserting extendedPayload into reports');
        const { error } = await supabase.from('reports').insert(extendedPayload);
        insertErr = error;
      }

      if (!insertErr) {
        console.log('[ReportModal] insert success (extendedPayload)');
      }

      // If optional columns don't exist, retry with core columns only
      if (insertErr && insertErr.code === 'PGRST204') {
        console.warn('[ReportModal] optional columns missing, retrying basePayload', insertErr);
        const { error } = await supabase.from('reports').insert(basePayload);
        insertErr = error;
      }

      if (insertErr) {
        console.error('[ReportModal] insert failed', insertErr);
        toast.error('Failed to submit report. Please try again.');
        return;
      }

      console.log('[ReportModal] showing success toast and closing modal');
      setShowSuccessSheet(true);
      setOpen(false);
      setReportDetails('');
    } catch (err) {
      console.error('[ReportModal] unexpected error', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      console.log('[ReportModal] finished submit (finally)');
      setSubmitting(false);
    }
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            size={triggerSize} 
            className={`gap-1 text-destructive ${triggerClassName}`}
          >
            <Flag className="w-4 h-4" />
            Report
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Report this listing</AlertDialogTitle>
            <AlertDialogDescription>
              Report "{listing.title}" by {sellerNameOverride || listing.seller_name || 'Seller'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
              <p><strong>Listing:</strong> {listing.title}</p>
              <p><strong>Seller:</strong> {(sellerNameOverride || listing.seller_name || 'Seller')} ({sellerEmailOverride || listing.seller_email || '—'})</p>
              <p><strong>ID:</strong> {listing.id}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Additional details (optional)
              </label>
              <Textarea
                placeholder="Describe why you're reporting this listing..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="mt-1.5 text-sm"
                rows={4}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReport}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportSuccessSheet isOpen={showSuccessSheet} onClose={() => setShowSuccessSheet(false)} />
    </>
  );
}