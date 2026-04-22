import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { Monitor, Car, Shirt, Home, Dumbbell, Trophy, BookOpen, Puzzle, Flower2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  electronics: Monitor,
  vehicles: Car,
  fashion: Shirt,
  home: Home,
  sports: Dumbbell,
  collectibles: Trophy,
  books: BookOpen,
  toys: Puzzle,
  garden: Flower2,
  other: MoreHorizontal,
};

const CATEGORIES = ['electronics', 'vehicles', 'fashion', 'home', 'sports', 'collectibles', 'books', 'toys', 'garden', 'other'];

export default function CategoryGrid({ selectedCategory }) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
      {CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat];
        const isActive = selectedCategory === cat;
        return (
          <Link
            key={cat}
            to={`/browse?category=${cat}`}
            className={cn(
              'border p-3 rounded-xl flex flex-col items-center gap-2 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-card border-border text-foreground hover:border-accent/50 hover:text-accent'
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="hidden sm:block text-[11px] font-medium text-center leading-tight">
              {t(`categories.${cat}`)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}