import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase'
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, Tag, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getWalletState, checkPublishEligibility, chargeListingFee } from '@/lib/wallet';
import PublishFeeBanner from '@/components/wallet/PublishFeeBanner';
import TopUpModal from '@/components/wallet/TopUpModal';
import ImageUploader from '@/components/listings/ImageUploader';
import { cn } from '@/lib/utils';

const CATEGORIES = ['electronics', 'vehicles', 'fashion', 'home', 'sports', 'collectibles', 'books', 'toys', 'garden', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const LOCATIONS = ['riga', 'daugavpils', 'liepaja', 'jelgava', 'jurmala', 'ventspils', 'rezekne', 'valmiera', 'jekabpils', 'ogre', 'tukums', 'cesis', 'other'];
const DURATIONS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '5', label: '5 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
];
const MAX_IMAGES = 8;

export default function CreateListing() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [walletState, setWalletState] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    condition: 'good',
    listing_type: 'auction',
    price: '',
    min_bid_increment: '1',
    buy_now_price: '',
    duration: '7',
    location: 'riga',
    images: [],
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.log(error)

      const authUser = data?.user
      if (!authUser) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)

      if (profileError) console.log(profileError)

      const profile = Array.isArray(profileData) ? profileData[0] : null
      const u = {
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
        id: authUser.id,
      }

      setUser(u);
      const ws = await getWalletState(u.id);
      setWalletState(ws);
      setEligibility(checkPublishEligibility(ws));
    })().catch(() => {});
  }, []);

  const refreshWallet = async () => {
    if (!user) return;
    const ws = await getWalletState(user.id);
    setWalletState(ws);
    setEligibility(checkPublishEligibility(ws));
  };

  const handleImagesAdded = (urls) => {
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
  };

  const handleRemoveImage = (idx) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    const errors = [];
    if (!form.title.trim()) errors.push('Title is required');
    if (!form.category) errors.push('Category is required');
    if (!form.price || parseFloat(form.price) <= 0) errors.push(`${form.listing_type === 'auction' ? 'Starting price' : 'Price'} must be greater than 0`);
    if (!form.location) errors.push('Location is required');
    if (form.images.length === 0) errors.push('At least one photo is required');
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    if (!user?.email) {
      toast.error('Please log in to publish.');
      return;
    }

    // Re-fetch fresh wallet state before checking eligibility (avoids stale data)
    const freshWallet = await getWalletState(user?.id);
    const freshEligibility = checkPublishEligibility(freshWallet);
    setWalletState(freshWallet);
    setEligibility(freshEligibility);

    if (!freshEligibility.canPublish) {
      toast.error('Please top up your wallet to publish.');
      setShowTopUp(true);
      return;
    }

    setIsSubmitting(true);
    try {
    const data = {

      title: form.title,
      description: form.description,
      category: form.category,
      condition: form.condition,
      listing_type: form.listing_type,
      price: parseFloat(form.price),
      location: form.location,
      images: form.images,
      seller_id: user?.id,
      status: 'active',
      views: 0,
      bid_count: 0,
      published: true,
      is_sold: false,
    };

    if (form.listing_type === 'auction') {
      data.min_bid_increment = parseFloat(form.min_bid_increment) || 1;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(form.duration));
      data.auction_end = endDate.toISOString();
      if (form.buy_now_price) {
        data.buy_now_price = parseFloat(form.buy_now_price);
      }
    }

    const { data: listing, error } = await supabase
      .from('listings')
      .insert(data)
      .select('*')
      .single();

    if (error) {
      console.log(error)
      throw error
    }
    await chargeListingFee(user, freshWallet, listing.id);
    toast.success('Listing published!');
    window.location.href = '/profile';
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-display font-bold mb-8">{t('create.title')}</h1>

      <div className="space-y-6">
        {/* Listing Type */}
        <div>
          <Label className="mb-2 block">{t('create.listingType')}</Label>
          <Tabs value={form.listing_type} onValueChange={(v) => setForm(f => ({ ...f, listing_type: v }))}>
            <TabsList className="w-full">
              <TabsTrigger value="auction" className="flex-1 gap-2">
                <Gavel className="w-4 h-4" />
                {t('create.auctionType')}
              </TabsTrigger>
              <TabsTrigger value="fixed" className="flex-1 gap-2">
                <Tag className="w-4 h-4" />
                {t('create.fixedPrice')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">{t('create.listingTitle')} *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setValidationErrors([]); }}
            className={cn("mt-1.5", validationErrors.some(e => e.includes('Title')) && "border-destructive ring-1 ring-destructive")}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="desc">{t('create.description')}</Label>
          <Textarea
            id="desc"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            className="mt-1.5 min-h-[120px]"
          />
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('create.category')} *</Label>
            <Select value={form.category} onValueChange={(v) => { setForm(f => ({ ...f, category: v })); setValidationErrors([]); }}>
              <SelectTrigger className={cn("mt-1.5", validationErrors.some(e => e.includes('Category')) && "border-destructive ring-1 ring-destructive")}><SelectValue placeholder={t('create_extra.selectCategory')} /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('create.condition')}</Label>
            <Select value={form.condition} onValueChange={(v) => setForm(f => ({ ...f, condition: v }))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => (
                  <SelectItem key={c} value={c}>{t(`conditions.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price */}
        <div>
          <Label>{form.listing_type === 'auction' ? t('create.startingPrice') : t('create.price')} *</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => { setForm(f => ({ ...f, price: e.target.value })); setValidationErrors([]); }}
              className={cn("pl-7", validationErrors.some(e => e.includes('price') || e.includes('Price')) && "border-destructive ring-1 ring-destructive")}
            />
          </div>
        </div>

        {/* Buy Now price (auction only) */}
        {form.listing_type === 'auction' && (
           <div>
             <Label>{t('listing.buyNow')} <span className="text-muted-foreground font-normal">({t('create_extra.optional')})</span></Label>
             <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
               {t('create_extra.buyNowHelper')}
             </p>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
               <Input
                 type="number"
                 step="0.01"
                 min="0"
                 value={form.buy_now_price}
                 onChange={(e) => setForm(f => ({ ...f, buy_now_price: e.target.value }))}
                 placeholder={t('create_extra.leaveEmpty')}
                 className="pl-7"
               />
             </div>
           </div>
         )}

        {/* Duration & Location */}
        <div className="grid grid-cols-2 gap-4">
          {form.listing_type === 'auction' && (
            <div>
              <Label>{t('create.duration')}</Label>
              <Select value={form.duration} onValueChange={(v) => setForm(f => ({ ...f, duration: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>{t('create.location')} *</Label>
            <Select value={form.location} onValueChange={(v) => setForm(f => ({ ...f, location: v }))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(l => (
                  <SelectItem key={l} value={l}>{t(`locations.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Images */}
        <div>
          <Label>{t('create.images')}</Label>
          <div className="mt-1.5">
            <ImageUploader
              maxImages={MAX_IMAGES}
              currentCount={form.images.length}
              uploadedImages={form.images}
              onImagesAdded={handleImagesAdded}
              onRemoveImage={handleRemoveImage}
            />
          </div>
        </div>

        {/* Publish fee banner */}
        {walletState && eligibility && (
          <PublishFeeBanner
            eligibility={eligibility}
            walletState={walletState}
            onTopUp={() => setShowTopUp(true)}
          />
        )}

        {/* Publish disclaimer */}
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-foreground font-medium">
            {t('create_extra.disclaimer')}
          </p>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm font-semibold text-destructive">{t('create_extra.fixErrors')}</p>
            </div>
            <ul className="space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i} className="text-sm text-destructive flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={() => {
            if (isSubmitting) return;
            const errors = validate();
            if (errors.length > 0) {
              setValidationErrors(errors);
              return;
            }
            setValidationErrors([]);
            setShowConfirmPublish(true);
          }}
          disabled={isSubmitting}
          className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground text-lg font-semibold disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('create.publish')}
        </Button>
      </div>

      {user && walletState && (
        <TopUpModal
          open={showTopUp}
          onClose={() => setShowTopUp(false)}
          user={user}
          walletBalance={walletState.wallet_balance}
          onSuccess={(newBalance) => {
            refreshWallet();
          }}
        />
      )}

      {/* Publish confirmation modal */}
      {showConfirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 max-w-sm mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-foreground">{t('create_extra.confirmPublish')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('create_extra.confirmDisclaimer')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1 h-9 rounded-md border border-input bg-background hover:bg-accent/5 text-sm font-medium transition-colors"
              >
                {t('create_extra.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowConfirmPublish(false);
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="flex-1 h-9 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('create_extra.publish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}