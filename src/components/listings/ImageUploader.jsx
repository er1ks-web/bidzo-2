import { useState } from 'react';
import { supabase } from '@/supabase'
import { Upload, Loader2, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BUCKET_NAME = 'listing-images'

// Performance timing wrapper
const createPerformanceTimer = (label) => {
  const startTime = performance.now();
  return {
    mark: (phase) => {
      const elapsed = performance.now() - startTime;
      console.log(`[${label}] ${phase}: ${elapsed.toFixed(2)}ms`);
    },
    end: (phase) => {
      const elapsed = performance.now() - startTime;
      console.log(`[${label}] ${phase} (TOTAL): ${elapsed.toFixed(2)}ms`);
      return elapsed;
    }
  };
};

const compressImage = async (file) => {
  const timer = createPerformanceTimer(`Compress: ${file.name}`);
  
  return new Promise((resolve, reject) => {
    timer.mark('FileReader started');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      timer.mark('FileReader done');
      timer.mark('Image decode started');
      
      const img = new Image();
      img.src = String(event.target.result);
      
      img.onload = () => {
        timer.mark('Image decode done');
        timer.mark('Canvas resize started');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        timer.mark('Canvas draw done');
        timer.mark('Blob compression started');
        
        canvas.toBlob(
          (blob) => {
            timer.end('toBlob done');
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
            console.log(`[Compress: ${file.name}] Original: ${(file.size / 1024).toFixed(2)}KB → Compressed: ${(blob.size / 1024).toFixed(2)}KB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function ImageUploader({ maxImages, currentCount, onImagesAdded, onRemoveImage, uploadedImages }) {
  const [uploadingStates, setUploadingStates] = useState({});
  const isAtMax = currentCount >= maxImages;

  const handleImageUpload = async (e) => {
    const selectionTimer = createPerformanceTimer('Upload Session');
    selectionTimer.mark('File selection');
    
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    console.log(`[Upload] Selected ${files.length} files`);
    files.forEach(f => console.log(`  - ${f.name}: ${(f.size / 1024).toFixed(2)}KB`));

    const totalImages = currentCount + files.length;
    if (totalImages > maxImages) {
      const remaining = maxImages - currentCount;
      toast.error(`Max ${maxImages} images. You can add ${remaining} more.`);
      return;
    }

    // Initialize upload states
    const states = {};
    files.forEach((file, idx) => {
      states[idx] = { status: 'compressing', progress: 0 };
    });
    setUploadingStates(states);
    selectionTimer.mark('UI state initialized');

    try {
      // Phase 1: Compression
      console.log('\n=== PHASE 1: Compression ===');
      const compressionStart = performance.now();
      const compressedFiles = await Promise.all(
        files.map(async (file, idx) => {
          const result = await compressImage(file);
          setUploadingStates(s => ({ ...s, [idx]: { status: 'compressing', progress: 100 } }));
          return result;
        })
      );
      const compressionTotal = performance.now() - compressionStart;
      console.log(`Compression phase total: ${compressionTotal.toFixed(2)}ms\n`);

      // Phase 2: Upload in parallel
      console.log('=== PHASE 2: Upload ===');
      const uploadStart = performance.now();
      const uploadedUrls = [];

      // Upload all in parallel (no batching - test baseline)
      const uploadPromises = compressedFiles.map((file, idx) => {
        const uploadTimer = createPerformanceTimer(`Upload: ${files[idx].name}`);
        uploadTimer.mark('Upload request sent');
        
        return (async () => {
          try {
            setUploadingStates(s => ({ ...s, [idx]: { status: 'uploading', progress: 0 } }));

            const ext = (files[idx].name || '').split('.').pop() || 'jpg'
            const filePath = `listings/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`

            const { error: uploadError } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(filePath, file, {
                contentType: file.type || 'image/jpeg',
              })

            if (uploadError) throw uploadError

            uploadTimer.mark('Response received');
            setUploadingStates(s => ({ ...s, [idx]: { status: 'done', progress: 100 } }));
            uploadTimer.end('State updated');

            const { data: publicData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(filePath)

            return publicData?.publicUrl
          } catch (err) {
            uploadTimer.mark('Upload error');
            setUploadingStates(s => ({ ...s, [idx]: { status: 'error', progress: 0 } }));
            throw err;
          }
        })();
      });

      uploadedUrls.push(...await Promise.all(uploadPromises));
      const uploadTotal = performance.now() - uploadStart;
      console.log(`Upload phase total: ${uploadTotal.toFixed(2)}ms\n`);

      // Phase 3: Callback + State Update
      console.log('=== PHASE 3: Callback & State ===');
      const callbackStart = performance.now();
      onImagesAdded(uploadedUrls);
      const callbackTime = performance.now() - callbackStart;
      console.log(`onImagesAdded callback: ${callbackTime.toFixed(2)}ms`);

      const stateStart = performance.now();
      setUploadingStates({});
      const stateTime = performance.now() - stateStart;
      console.log(`Clear upload states: ${stateTime.toFixed(2)}ms\n`);

      const totalTime = selectionTimer.end('Complete upload session');
      console.log(`\n*** SUMMARY ***`);
      console.log(`Total: ${totalTime.toFixed(2)}ms`);
      console.log(`  Compression: ${compressionTotal.toFixed(2)}ms (${((compressionTotal / totalTime) * 100).toFixed(1)}%)`);
      console.log(`  Upload: ${uploadTotal.toFixed(2)}ms (${((uploadTotal / totalTime) * 100).toFixed(1)}%)`);
      console.log(`  Callback: ${callbackTime.toFixed(2)}ms`);
      console.log(`  State: ${stateTime.toFixed(2)}ms`);

      toast.success(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error('Failed to upload some images. Please try again.');
      console.error('Upload error:', err);
      setUploadingStates({});
    }
  };

  const isUploading = Object.keys(uploadingStates).length > 0;

  return (
    <div className="space-y-3">
      <label
        className={cn(
          'flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all',
          isAtMax ? 'border-destructive/30 bg-destructive/5 cursor-not-allowed opacity-60' : 'border-border hover:border-accent hover:bg-accent/5'
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {isAtMax ? `Max ${maxImages} reached` : 'Click to upload images'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {currentCount} / {maxImages}
            </span>
          </>
        )}
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isAtMax || isUploading}
          className="hidden"
        />
      </label>

      {/* Thumbnails with upload progress */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Uploaded images:</p>
          <div className="flex gap-2 flex-wrap">
            {uploadedImages.map((url, idx) => (
              <div
                key={idx}
                className="shrink-0 relative group rounded-lg overflow-hidden border border-border w-20 h-20"
              >
                <img src={url} alt="" className="w-full h-full object-cover bg-muted" />
                <button
                  onClick={() => onRemoveImage(idx)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-0.5">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-progress uploads */}
      {Object.keys(uploadingStates).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Uploading:</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(uploadingStates).map(([idx, state]) => (
              <div
                key={idx}
                className="shrink-0 relative w-20 h-20 rounded-lg border border-accent bg-accent/10 flex items-center justify-center"
              >
                {state.status === 'compressing' && (
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-1"></div>
                    <span className="text-xs text-accent">Compress</span>
                  </div>
                )}
                {state.status === 'uploading' && (
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-1"></div>
                    <span className="text-xs text-accent">Upload</span>
                  </div>
                )}
                {state.status === 'done' && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
                {state.status === 'error' && (
                  <X className="w-6 h-6 text-destructive" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}