import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor, Check, Gavel, Trophy, Clock, MessageCircle, Package, Mail, BellRing } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext.jsx';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n.jsx';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';
import { supabase } from '@/supabase';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import DeleteAccountCard from '@/components/profile/DeleteAccountCard';
import { isNativeApp } from '@/lib/native';
import { getPushPermission, requestPushPermission } from '@/lib/push';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState('unsupported');

  useEffect(() => {
    getPushPermission().then(setPushPermission);
  }, []);

  const handleAllowPush = async () => {
    setPushPermission(await requestPushPermission());
  };

  const APPEARANCE_OPTIONS = [
    { value: 'light', label: t('settings_page.themeLight'), description: t('settings_page.themeLightDesc'), icon: Sun },
    { value: 'dark', label: t('settings_page.themeDark'), description: t('settings_page.themeDarkDesc'), icon: Moon },
    { value: 'system', label: t('settings_page.themeSystem'), description: t('settings_page.themeSystemDesc'), icon: Monitor },
  ];

  // Master switches: which channel. The per-type switches below decide which notifications.
  const CHANNEL_OPTIONS = [
    { field: 'email_enabled', label: t('settings_page.channelEmailLabel'), description: t('settings_page.channelEmailDesc'), icon: Mail },
    ...(isNativeApp
      ? [{ field: 'push_enabled', label: t('settings_page.channelPushLabel'), description: t('settings_page.channelPushDesc'), icon: BellRing }]
      : []),
  ];

  const NOTIFICATION_OPTIONS = [
    { field: 'outbid', label: t('settings_page.notifOutbidLabel'), description: t('settings_page.notifOutbidDesc'), icon: Gavel },
    { field: 'auction_won', label: t('settings_page.notifWonLabel'), description: t('settings_page.notifWonDesc'), icon: Trophy },
    { field: 'auction_ended', label: t('settings_page.notifEndedLabel'), description: t('settings_page.notifEndedDesc'), icon: Clock },
    { field: 'transaction_chat', label: t('settings_page.notifDealLabel'), description: t('settings_page.notifDealDesc'), icon: Package },
    { field: 'new_message', label: t('settings_page.notifMessageLabel'), description: t('settings_page.notifMessageDesc'), icon: MessageCircle },
  ];

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('notification_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.log(error);
        toast.error(t('settings_page.loadFailed'));
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
      toast.error(t('settings_page.updateFailed'));
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
          {t('settings_page.backToProfile')}
        </Link>

        <h1 className="text-2xl font-display font-bold mb-1">{t('settings_page.title')}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t('settings_page.subtitle')}</p>

        <div className="bg-card rounded-xl border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('settings_page.notificationsTitle')}</h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {NOTIFICATION_OPTIONS.map((o) => (
                <div key={o.field} className="h-[68px] rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {CHANNEL_OPTIONS.filter(({ field }) => prefs && field in prefs).map(({ field, label, description, icon: Icon }) => (
                <div key={field} className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-accent/40 bg-accent/5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent/15">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch checked={!!prefs?.[field]} onCheckedChange={() => handleToggle(field)} />
                </div>
              ))}
              {isNativeApp && prefs?.push_enabled && pushPermission === 'denied' && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground flex items-center justify-between gap-3">
                  <span>{t('settings_page.pushBlocked')}</span>
                  <button type="button" onClick={handleAllowPush} className="shrink-0 font-semibold text-accent">
                    {t('settings_page.pushAllow')}
                  </button>
                </div>
              )}
              {prefs && 'email_enabled' in prefs && (
                <p className="pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('settings_page.notificationTypes')}</p>
              )}
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

        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('settings_page.appearance')}</h2>
          </div>

          <div className="space-y-2">
            {APPEARANCE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const isActive = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors",
                    isActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
                  )}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-accent/15' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  {isActive && <Check className="w-5 h-5 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <DeleteAccountCard />
      </div>
    </div>
  );
}
