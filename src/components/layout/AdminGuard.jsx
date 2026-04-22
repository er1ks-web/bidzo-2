import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'admin' | 'denied' | 'guest'

  useEffect(() => {
    base44.auth.me()
      .then((user) => {
        if (!user) {
          setStatus('guest');
        } else if (user.role === 'admin') {
          setStatus('admin');
        } else {
          setStatus('denied');
        }
      })
      .catch(() => setStatus('guest'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'guest') {
    base44.auth.redirectToLogin('/admin');
    return null;
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold">Access Denied</h1>
          <p className="text-muted-foreground max-w-sm">
            You don't have permission to view this page. Admin access is required.
          </p>
          <Link to="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}