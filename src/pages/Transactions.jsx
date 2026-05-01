import { useState, useEffect } from 'react';
import { supabase } from '@/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, Trophy, ShoppingCart, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n.jsx';
import TransactionCard from '@/components/transactions/TransactionCard';
import { Skeleton } from '@/components/ui/skeleton';
import MarkShippedModal from '@/components/transactions/MarkShippedModal';

export default function Transactions() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(null);
  const [shippedModalTx, setShippedModalTx] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      localStorage.setItem('tx_last_seen', new Date().toISOString());
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.log(error)

      const authUser = data?.user
      if (!authUser) return

      setUser({
        id: authUser.id,
        email: authUser.email,
      })
    })().catch(() => {})
  }, []);

  const enrichTransactions = async (txs) => {
    const rows = Array.isArray(txs) ? txs : []
    if (rows.length === 0) return []

    const userIds = [...new Set(rows.flatMap(r => [r.buyer_id, r.seller_id]).filter(Boolean))]
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) console.log(profilesError)
    const profileRows = Array.isArray(profiles) ? profiles : []
    const profileById = new Map(profileRows.map(p => [p.id, p]))

    const listingIds = [...new Set(rows.map(r => r.listing_id).filter(Boolean))]
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .in('id', listingIds)

    if (listingsError) console.log(listingsError)
    const listingRows = Array.isArray(listings) ? listings : []
    const listingById = new Map(listingRows.map(l => [l.id, l]))

    return rows.map((tx) => {
      const buyer = profileById.get(tx.buyer_id)
      const seller = profileById.get(tx.seller_id)
      const listing = listingById.get(tx.listing_id)

      return {
        ...tx,
        listing_title: listing?.title || tx.listing_title || null,
        listing_image: (Array.isArray(listing?.images) ? listing.images[0] : null) || tx.listing_image || '',
        buyer_email: buyer?.email || null,
        seller_email: seller?.email || null,
        buyer_name: buyer?.username || buyer?.full_name || (buyer?.email ? buyer.email.split('@')[0] : null),
        seller_name: seller?.username || seller?.full_name || (seller?.email ? seller.email.split('@')[0] : null),
        created_date: tx.created_at || tx.created_date,
        updated_date: tx.updated_at || tx.updated_date,
      }
    })
  }

  const { data: asBuyer = [], isLoading: loadingBuyer } = useQuery({
    queryKey: ['tx-buyer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_transactions')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) console.log(error)
      const txs = await enrichTransactions(Array.isArray(data) ? data : [])

      // Filter out deleted listings (best-effort; safe even if `is_deleted` doesn't exist)
      const listingIds = [...new Set(txs.map(t => t.listing_id).filter(Boolean))]
      if (listingIds.length === 0) return txs
      const { data: listingRows, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)

      if (listingError) console.log(listingError)
      const listings = Array.isArray(listingRows) ? listingRows : []
      const deletedIds = new Set(listings.filter(l => l?.is_deleted).map(l => l.id));
      return txs.filter(tx => !deletedIds.has(tx.listing_id));
    },
    enabled: !!user,
  });

  const { data: asSeller = [], isLoading: loadingSeller } = useQuery({
    queryKey: ['tx-seller', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_transactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) console.log(error)
      const txs = await enrichTransactions(Array.isArray(data) ? data : [])

      // Filter out deleted listings (best-effort; safe even if `is_deleted` doesn't exist)
      const listingIds = [...new Set(txs.map(t => t.listing_id).filter(Boolean))]
      if (listingIds.length === 0) return txs
      const { data: listingRows, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)

      if (listingError) console.log(listingError)
      const listings = Array.isArray(listingRows) ? listingRows : []
      const deletedIds = new Set(listings.filter(l => l?.is_deleted).map(l => l.id));
      return txs.filter(tx => !deletedIds.has(tx.listing_id));
    },
    enabled: !!user,
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tx-buyer'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['tx-seller'], exact: false });
  };

  // Real-time subscription — updates all 4 steps live for both parties
  useEffect(() => {
    if (!user?.id) return;

    const markUnseenUpdate = () => {
      try {
        localStorage.setItem('tx_last_update', new Date().toISOString());
      } catch (e) {
        // ignore
      }
    }

    const onChange = () => {
      markUnseenUpdate()
      refetchAll();
    }

    const buyerChannel = supabase
      .channel(`auction_transactions_buyer_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_transactions', filter: `buyer_id=eq.${user.id}` },
        onChange
      )
      .subscribe();

    const sellerChannel = supabase
      .channel(`auction_transactions_seller_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_transactions', filter: `seller_id=eq.${user.id}` },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(buyerChannel);
      supabase.removeChannel(sellerChannel);
    };
  }, [user?.id, queryClient]);

  const handleConfirm = async (tx) => {
    setConfirmLoading(tx.id);
    const isBuyer = user.email === tx.buyer_email;
    const updates = isBuyer
      ? { buyer_confirmed: true, buyer_confirmed_at: new Date().toISOString() }
      : { seller_confirmed: true, seller_confirmed_at: new Date().toISOString() };

    // Check if both will now be confirmed
    const bothConfirmed = isBuyer ? tx.seller_confirmed : tx.buyer_confirmed;
    if (bothConfirmed) {
      updates.status = 'in_progress';
    } else {
      updates.status = isBuyer ? 'buyer_confirmed' : 'seller_confirmed';
    }

    const { error } = await supabase
      .from('auction_transactions')
      .update(updates)
      .eq('id', tx.id)

    if (error) console.log(error)

    if (bothConfirmed) {
       toast.success(t('deals.bothConfirmed'));
       // Update the listing status too
       const { error: listingError } = await supabase
         .from('listings')
         .update({ status: 'in_progress' })
         .eq('id', tx.listing_id)

       if (listingError) console.log(listingError)
     } else {
       toast.success(isBuyer ? t('deals.buyerConfirmed') : t('deals.sellerConfirmed'));
     }

    refetchAll();
    setConfirmLoading(null);
  };

  const handleMarkShipped = (tx) => {
    setShippedModalTx(tx);
  };

  const handleMarkShippedConfirm = async (shippingInfo) => {
    setConfirmLoading(shippedModalTx.id);
    const { error } = await supabase
      .from('auction_transactions')
      .update({
      shipped: true,
      shipped_at: new Date().toISOString(),
      ...(shippingInfo ? { shipping_info: shippingInfo } : {}),
      })
      .eq('id', shippedModalTx.id)

    if (error) console.log(error)
    toast.success(t('deals.markedShipped'));
    setShippedModalTx(null);
    refetchAll();
    setConfirmLoading(null);
  };

  const handleComplete = async (tx) => {
    setConfirmLoading(tx.id);
    const { error } = await supabase
      .from('auction_transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', tx.id)

    if (error) console.log(error)

    const { error: listingError } = await supabase
      .from('listings')
      .update({ status: 'completed', is_sold: true })
      .eq('id', tx.listing_id)

    if (listingError) console.log(listingError)
    toast.success(t('deals.completedMsg'));
    refetchAll();
    setConfirmLoading(null);
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  const activeBuyer = asBuyer.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const activeSeller = asSeller.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedAll = [...asBuyer, ...asSeller]
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.completed_at || b.updated_date) - new Date(a.completed_at || a.updated_date));
  const isLoading = loadingBuyer || loadingSeller;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Gavel className="w-6 h-6 text-accent" />
          {t('deals.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('deals.subtitle')}
        </p>
      </div>

      <MarkShippedModal
        open={!!shippedModalTx}
        onClose={() => setShippedModalTx(null)}
        onConfirm={handleMarkShippedConfirm}
        loading={!!confirmLoading}
      />

      <Tabs defaultValue="won">
        <TabsList className="w-full">
          <TabsTrigger value="won" className="flex-1 gap-2">
            <Trophy className="w-4 h-4" />
            {t('deals.won')} ({activeBuyer.length})
          </TabsTrigger>
          <TabsTrigger value="sold" className="flex-1 gap-2">
            <ShoppingCart className="w-4 h-4" />
            {t('deals.sold')} ({activeSeller.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 gap-2">
            <CheckCircle className="w-4 h-4" />
            {t('deals.completed')} ({completedAll.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="won" className="mt-6 space-y-4">
          {isLoading ? (
            [1,2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : activeBuyer.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t('deals.noWon')}</p>
              <p className="text-sm mt-1">{t('deals.noWonSub')}</p>
            </div>
          ) : (
            activeBuyer.map(tx => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                currentUserEmail={user.email}
                onConfirm={handleConfirm}
                onComplete={handleComplete}
                onMarkShipped={handleMarkShipped}
                confirmLoading={confirmLoading}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sold" className="mt-6 space-y-4">
          {isLoading ? (
            [1,2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : activeSeller.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t('deals.noSold')}</p>
              <p className="text-sm mt-1">{t('deals.noSoldSub')}</p>
            </div>
          ) : (
            activeSeller.map(tx => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                currentUserEmail={user.email}
                onConfirm={handleConfirm}
                onComplete={handleComplete}
                onMarkShipped={handleMarkShipped}
                confirmLoading={confirmLoading}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {isLoading ? (
            [1].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : completedAll.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>{t('deals.noCompleted')}</p>
            </div>
          ) : (
            completedAll.map(tx => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                currentUserEmail={user.email}
                onConfirm={handleConfirm}
                onComplete={handleComplete}
                onMarkShipped={handleMarkShipped}
                confirmLoading={confirmLoading}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}