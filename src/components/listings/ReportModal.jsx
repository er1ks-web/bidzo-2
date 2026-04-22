import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
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

export default function ReportModal({ listing, triggerClassName = '', triggerSize = 'sm' }) {
  const { user, requireLogin } = useAuth();
  const [reportDetails, setReportDetails] = useState('');
  const [open, setOpen] = useState(false);

  const handleReport = () => {
    if (!user) {
      requireLogin('Log in to report listings');
      return;
    }

    const sellerEmail = listing.seller_email;
    const reporterEmail = user.email;
    const listingTitle = listing.title;
    const listingUrl = window.location.href;

    const subject = `Report: ${listingTitle} (ID: ${listing.id})`;
    const body = `
Report Details
==============

Listing: ${listingTitle}
Listing ID: ${listing.id}
Seller: ${listing.seller_name} (${sellerEmail})
Category: ${listing.category}
Price: €${(listing.current_bid || listing.price)?.toFixed(2)}
Listing URL: ${listingUrl}

Reporter Email: ${reporterEmail}

Additional Details:
${reportDetails || '(No additional details provided)'}

---
Please review this report and take appropriate action if necessary.
`;

    const mailtoLink = `mailto:support@bidzo.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Track report event
    base44.analytics.track({
      eventName: 'listing_reported',
      properties: {
        listing_id: listing.id,
        listing_title: listing.title,
        seller_email: listing.seller_email,
        category: listing.category,
        price: listing.current_bid || listing.price,
        has_details: !!reportDetails,
      }
    });
    
    window.location.href = mailtoLink;
    setOpen(false);
    setReportDetails('');
    toast.success('Opening email client to submit your report...');
  };

  return (
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
            Report "{listing.title}" by {listing.seller_name}. Your email client will open with pre-filled information.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
            <p><strong>Listing:</strong> {listing.title}</p>
            <p><strong>Seller:</strong> {listing.seller_name} ({listing.seller_email})</p>
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
            className="bg-destructive hover:bg-destructive/90"
          >
            Submit Report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}