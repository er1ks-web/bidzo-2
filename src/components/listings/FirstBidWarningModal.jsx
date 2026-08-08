import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n.jsx';

export default function FirstBidWarningModal({ isOpen, onConfirm, onCancel }) {
  const { t } = useI18n();
  const [isChecked, setIsChecked] = useState(false);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-destructive/30 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h2 className="font-bold text-lg text-foreground">{t('first_bid_warning.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('first_bid_warning.body')}
                </p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-2 text-sm text-muted-foreground">
              <p>• {t('first_bid_warning.bullet1')}</p>
              <p>• {t('first_bid_warning.bullet2')}</p>
              <p>• {t('first_bid_warning.bullet3')}</p>
            </div>

            {/* The whole row is the tap target, not just the 16px checkbox glyph --
                easy to miss precisely on a phone otherwise. */}
            <label
              htmlFor="acknowledge"
              className="flex items-start gap-3 rounded-lg p-2 -m-2 cursor-pointer active:bg-muted/60 transition-colors"
            >
              <input
                type="checkbox"
                id="acknowledge"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-5 h-5 shrink-0 cursor-pointer accent-accent"
              />
              <span className="text-sm cursor-pointer text-foreground">
                {t('first_bid_warning.checkboxLabel')}
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!isChecked}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => {
                  onConfirm();
                  setIsChecked(false);
                }}
              >
                {t('bid_panel.placeBid')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}