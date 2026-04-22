import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n.jsx';
import { ArrowRight } from 'lucide-react';
import ListingCard from '../listings/ListingCard';

export default function ListingSection({ title, listings, linkTo, emptyMessage }) {
  const { t } = useI18n();

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl sm:text-2xl font-display font-bold">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium transition-colors">
            {t('common.seeAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      {listings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage || t('common.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}