import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserRating(email) {
  return useQuery({
    queryKey: ['user-rating', email],
    queryFn: async () => {
      if (!email) return { avg: null, count: 0 };
      const reviews = await base44.entities.Review.filter({ reviewed_email: email });
      if (!reviews.length) return { avg: null, count: 0 };
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      return { avg: Math.round(avg * 10) / 10, count: reviews.length };
    },
    enabled: !!email,
    staleTime: 60000,
  });
}