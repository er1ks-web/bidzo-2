import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase'

export function useUserRating(userId) {
  return useQuery({
    queryKey: ['user-rating', userId],
    queryFn: async () => {
      if (!userId) return { avg: null, count: 0 };

      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', userId)
        .limit(500)

      if (error) console.log(error)
      const rows = Array.isArray(data) ? data : []
      if (!rows.length) return { avg: null, count: 0 };
      const avg = rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / rows.length;
      return { avg: Math.round(avg * 10) / 10, count: rows.length };
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}