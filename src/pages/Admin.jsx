import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Gift, RefreshCw, History, Loader2 } from 'lucide-react';
import { grantPromoCredit } from '@/lib/wallet';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Admin() {
  const [promoEmail, setPromoEmail] = useState('');
  const [promoAmount, setPromoAmount] = useState('');
  const [promoNote, setPromoNote] = useState('');
  const [adjustEmail, setAdjustEmail] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('admin_adjustment');
  const [adjustNote, setAdjustNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyEmail, setHistoryEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const { data: transactions = [], refetch: refetchTx } = useQuery({
    queryKey: ['admin-wallet-tx', searchEmail],
    queryFn: () => searchEmail
      ? base44.entities.WalletTransaction.filter({ user_email: searchEmail }, '-created_date', 50)
      : base44.entities.WalletTransaction.list('-created_date', 30),
    enabled: true,
  });

  const handlePromo = async () => {
    const amt = parseFloat(promoAmount);
    if (!promoEmail || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid email and amount');
      return;
    }
    setLoading(true);
    await grantPromoCredit('admin', promoEmail, amt, promoNote || `Promo credit €${amt}`);
    toast.success(`Granted €${amt} promo credit to ${promoEmail}`);
    setPromoEmail(''); setPromoAmount(''); setPromoNote('');
    setLoading(false);
    refetchTx();
  };

  const handleAdjust = async () => {
    const amt = parseFloat(adjustAmount);
    if (!adjustEmail || isNaN(amt)) {
      toast.error('Please enter a valid email and amount');
      return;
    }
    setLoading(true);
    const users = await base44.entities.User.filter({ email: adjustEmail }, '-created_date', 1);
    const u = users[0];
    if (!u) { toast.error('User not found'); setLoading(false); return; }
    await base44.entities.User.update(u.id, { wallet_balance: (u.wallet_balance ?? 0) + amt });
    await base44.entities.WalletTransaction.create({
      user_email: adjustEmail,
      transaction_type: adjustType,
      amount: amt,
      description: adjustNote || `Admin ${adjustType.replace('_', ' ')}`,
    });
    toast.success(`Adjusted wallet for ${adjustEmail}: ${amt > 0 ? '+' : ''}€${amt}`);
    setAdjustEmail(''); setAdjustAmount(''); setAdjustNote('');
    setLoading(false);
    refetchTx();
  };

  const TX_COLORS = {
    top_up: 'bg-green-100 text-green-700',
    promo_credit: 'bg-blue-100 text-blue-700',
    listing_fee: 'bg-red-100 text-red-700',
    success_fee: 'bg-red-100 text-red-700',
    refund: 'bg-green-100 text-green-700',
    admin_adjustment: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-display font-bold">Admin — Wallet Controls</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Grant Promo Credit */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Gift className="w-4 h-4 text-blue-500" />
            Grant Promo Credit
          </div>
          <div className="space-y-3">
            <div>
              <Label>User Email</Label>
              <Input value={promoEmail} onChange={e => setPromoEmail(e.target.value)} placeholder="user@email.com" className="mt-1" />
            </div>
            <div>
              <Label>Amount (€)</Label>
              <Input type="number" min="0" step="0.01" value={promoAmount} onChange={e => setPromoAmount(e.target.value)} placeholder="5.00" className="mt-1" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={promoNote} onChange={e => setPromoNote(e.target.value)} placeholder="Spring promotion..." className="mt-1" />
            </div>
            <Button onClick={handlePromo} disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Grant Credit'}
            </Button>
          </div>
        </div>

        {/* Adjust Balance */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <RefreshCw className="w-4 h-4 text-yellow-500" />
            Adjust / Refund Balance
          </div>
          <div className="space-y-3">
            <div>
              <Label>User Email</Label>
              <Input value={adjustEmail} onChange={e => setAdjustEmail(e.target.value)} placeholder="user@email.com" className="mt-1" />
            </div>
            <div>
              <Label>Amount (€, negative to deduct)</Label>
              <Input type="number" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="-2.50 or 10.00" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_adjustment">Admin Adjustment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="success_fee">Success Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Reason..." className="mt-1" />
            </div>
            <Button onClick={handleAdjust} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Adjustment'}
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold">
            <History className="w-4 h-4 text-muted-foreground" />
            Transaction History
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Filter by email..."
              value={historyEmail}
              onChange={e => setHistoryEmail(e.target.value)}
              className="w-48 h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={() => { setSearchEmail(historyEmail); refetchTx(); }}>
              Search
            </Button>
            {searchEmail && <Button size="sm" variant="ghost" onClick={() => { setSearchEmail(''); setHistoryEmail(''); }}>Clear</Button>}
          </div>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
          ) : transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
              <div className="flex items-center gap-3">
                <Badge className={TX_COLORS[tx.transaction_type] || ''}>{tx.transaction_type.replace('_', ' ')}</Badge>
                <div>
                  <p className="font-medium">{tx.user_email}</p>
                  <p className="text-xs text-muted-foreground">{tx.description}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount === 0 ? 'Free' : tx.amount > 0 ? `+€${tx.amount.toFixed(2)}` : `-€${Math.abs(tx.amount).toFixed(2)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.created_date ? format(new Date(tx.created_date), 'MMM d, HH:mm') : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}