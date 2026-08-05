import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor, Check, Gavel, Trophy, Clock, MessageCircle, Package } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext.jsx';
import { useAuth } from '@/lib/AuthContext';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';
import { supabase } from '@/supabase';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Bright background, always on', icon: Sun },
  { value: 'dark', label: 'Dark', description: "Bidzo's original dark look", icon: Moon },
  { value: 'system', label: 'Match device', description: 'Follows your device setting', icon: Monitor },
];

const NOTIFICATION_OPTIONS = [
  { field: 'outbid', label: 'Outbid alerts', description: "Someone placed a higher bid than yours", icon: Gavel },
  { field: 'auction_won', label: 'Auction won / bought', description: 'You won an auction or completed a Buy Now', icon: Trophy },
  { field: 'auction_ended', label: 'Auction ended reminders', description: 'Your auction ended and needs a winner accepted', icon: Clock },
  { field: 'transaction_chat', label: 'Deal updates', description: 'Confirmations, shipping and delivery status on your deals', icon: Package },
  { field: 'new_message', label: 'New messages', description: 'Someone sent you a message on Bidzo', icon: MessageCircle },
];

export default function Settings() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('notification_prefs')
        .select('outbid, auction_won, auction_ended, transaction_chat, new_message')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.log(error);
        toast.error('Failed to load notification settings');
      } else {
        setPrefs(data);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleToggle = async (field) => {
    if (!prefs) return;
    const previous = prefs[field];
    setPrefs((p) => ({ ...p, [field]: !previous }));

    const { error } = await supabase
      .from('notification_prefs')
      .update({ [field]: !previous })
      .eq('user_id', user.id);

    if (error) {
      console.log(error);
      toast.error('Failed to update notification setting');
      setPrefs((p) => ({ ...p, [field]: previous }));
    }
  };

  return (
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Link>

        <h1 className="text-2xl font-display font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm mb-8">Manage how Bidzo looks and notifies you.</p>

        <div className="bg-card rounded-xl border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email notifications</h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {NOTIFICATION_OPTIONS.map((o) => (
                <div key={o.field} className="h-[68px] rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {NOTIFICATION_OPTIONS.map(({ field, label, description, icon: Icon }) => (
                <div
                  key={field}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-muted">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={!!prefs?.[field]}
                    onCheckedChange={() => handleToggle(field)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border p-6 opacity-60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Appearance</h2>
            <Badge variant="secondary" className="font-normal">Coming soon</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4 -mt-2">
            We're polishing the light palette before turning this on — for now Bidzo stays in dark mode.
          </p>

          <div className="space-y-2 pointer-events-none select-none">
            {APPEARANCE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const isActive = theme === value;
              return (
                <div
                  key={value}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left ${
                    isActive ? 'border-accent bg-accent/5' : 'border-border'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-accent/15' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  {isActive && <Check className="w-5 h-5 text-accent shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
