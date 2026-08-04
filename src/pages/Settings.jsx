import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext.jsx';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';

const OPTIONS = [
  { value: 'light', label: 'Light', description: 'Bright background, always on', icon: Sun },
  { value: 'dark', label: 'Dark', description: "Bidzo's original dark look", icon: Moon },
  { value: 'system', label: 'Match device', description: 'Follows your device setting', icon: Monitor },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();

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
        <p className="text-muted-foreground text-sm mb-8">Change how Bidzo looks on this device.</p>

        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Appearance</h2>

          <div className="space-y-2">
            {OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const isActive = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                    isActive ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
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
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
