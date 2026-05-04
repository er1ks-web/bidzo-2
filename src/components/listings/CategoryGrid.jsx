import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_ICONS } from '@/lib/categories';

export default function CategoryGrid({ selectedCategory }) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-9 gap-3">
      {CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat];
        const isActive = selectedCategory === cat;
        return (
          <Link
            key={cat}
            to={`/browse?category=${cat}`}
            className={cn(
              'border p-4 rounded-xl flex flex-col items-center gap-2 transition-colors',
              isActive
                ? 'bg-card text-accent border-accent'
                : 'bg-card border-border text-foreground hover:border-accent/50 hover:text-accent'
            )}
          >
            <Icon className="w-7 h-7" />
            <span className="hidden sm:block text-[11px] font-medium text-center leading-tight">
              {t(`categories.${cat}`)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}