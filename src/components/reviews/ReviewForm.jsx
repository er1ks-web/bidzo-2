import { useState, useRef } from 'react';
import { supabase } from '@/supabase'
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import StarRatingInput from './StarRatingInput';

const BUCKET_NAME = 'review-images'

export default function ReviewForm({ transaction, currentUser, targetId, targetEmail, targetName, roleOfReviewer, existingReview, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [images, setImages] = useState([]); // { file, previewUrl }
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  let existingImages = []
  try {
    if (existingReview?.images) {
      if (Array.isArray(existingReview.images)) existingImages = existingReview.images
      else if (typeof existingReview.images === 'string') {
        const val = JSON.parse(existingReview.images)
        if (Array.isArray(val)) existingImages = val
      }
    }
  } catch (e) {
    existingImages = []
  }

  if (existingReview) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-green-400">Review submitted</span>
        </div>
        <div className="flex gap-1 mb-1">
          {[1,2,3,4,5].map(s => (
            <span key={s} className={`text-sm ${s <= existingReview.rating ? 'text-accent' : 'text-muted'}`}>★</span>
          ))}
        </div>
        {existingReview.review_text && (
          <p className="text-sm text-muted-foreground italic">"{existingReview.review_text}"</p>
        )}
        {existingImages?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {existingImages.map((url, i) => (
              <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - images.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...toAdd]);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a star rating'); return; }
    setSubmitting(true);

    // Upload images
    let uploadedUrls = [];
    for (const img of images) {
      try {
        const file = img.file
        const ext = (file?.name?.split('.')?.pop() || 'jpg').toLowerCase()
        const fileName = `${transaction.id}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`

        const { error: uploadError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          console.log(uploadError)
          continue
        }

        const { data: publicUrlData } = supabase
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName)

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl)
        }
      } catch (error) {
        console.log(error)
      }
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          transaction_id: transaction.id,
          listing_id: transaction.listing_id,
          reviewer_id: currentUser.id,
          reviewed_id: targetId,
          role_of_reviewer: roleOfReviewer,
          rating,
          review_text: text.trim() || null,
          images: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null,
        })

      if (error) console.log(error)
    } catch (error) {
      console.log(error)
    }

    toast.success('Review submitted!');
    onReviewSubmitted?.();
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">
        Rate <span className="text-accent">{targetName || targetEmail.split('@')[0]}</span>
        <span className="text-muted-foreground font-normal ml-1">(as {roleOfReviewer})</span>
      </p>
      <StarRatingInput value={rating} onChange={setRating} />
      <Textarea
        placeholder="Share your experience (optional)"
        value={text}
        onChange={e => setText(e.target.value)}
        className="min-h-[72px] text-sm resize-none"
        maxLength={300}
      />

      {/* Image upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative w-16 h-16">
              <img src={img.previewUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="text-[9px]">Photo</span>
            </button>
          )}
        </div>
        {images.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{images.length}/3 photos</p>
        )}
      </div>

      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={submitting || !rating}
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {submitting ? 'Uploading & submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}