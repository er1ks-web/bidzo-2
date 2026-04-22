import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PREFS = [
  { key: 'outbid', label: 'Outbid notifications', description: "Get emailed when someone outbids you on a listing." },
  { key: 'auction_won', label: 'Auction won', description: "Get emailed when you win an auction." },
  { key: 'auction_ended', label: 'Auction ended (as seller)', description: "Get emailed when your auction ends with a winner." },
  { key: 'transaction_chat', label: 'Transaction chat created', description: "Get emailed when a post-auction chat thread is opened." },
  { key: 'new_message', label: 'New messages', description: "Get emailed when another user sends you a message." },
];

export default function NotificationPrefsCard({ user }) {
  const [prefs, setPrefs] = useState(null);
  const [prefsId, setPrefsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.NotificationPrefs.filter({ user_email: user.email })
      .then(results => {
        if (results[0]) {
          setPrefsId(results[0].id);
          setPrefs(results[0]);
        } else {
          // Default all true
          setPrefs({ outbid: true, auction_won: true, auction_ended: true, transaction_chat: true, new_message: true });
        }
      });
  }, [user?.email]);

  const toggle = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      user_email: user.email,
      outbid: prefs.outbid,
      auction_won: prefs.auction_won,
      auction_ended: prefs.auction_ended,
      transaction_chat: prefs.transaction_chat,
      new_message: prefs.new_message,
    };
    if (prefsId) {
      await base44.entities.NotificationPrefs.update(prefsId, data);
    } else {
      const created = await base44.entities.NotificationPrefs.create(data);
      setPrefsId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast.success('Notification preferences saved!');
  };

  if (!prefs) {
    return <div className="bg-card rounded-xl border p-6 animate-pulse h-40" />;
  }

  return (
    <div className="bg-card rounded-xl border p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-accent" />
        <h3 className="font-semibold text-base">Email Notifications</h3>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Choose which events send you an email. All are enabled by default.
      </p>

      <div className="space-y-3">
        {PREFS.map(({ key, label, description }) => (
          <div
            key={key}
            className={cn(
              "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors cursor-pointer",
              prefs[key] ? "border-accent/30 bg-accent/5" : "border-border bg-muted/20"
            )}
            onClick={() => toggle(key)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            {/* Toggle */}
            <div className={cn(
              "shrink-0 w-10 h-6 rounded-full transition-colors flex items-center px-0.5",
              prefs[key] ? "bg-accent" : "bg-muted"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow transition-transform",
                prefs[key] ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'gap-2 min-w-[140px]',
            saved ? 'bg-green-600 hover:bg-green-600' : 'bg-accent hover:bg-accent/90 text-accent-foreground'
          )}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  );
}