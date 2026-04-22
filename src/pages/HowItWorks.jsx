import { Link } from 'react-router-dom';
import { ArrowRight, User, Package, Gavel, Trophy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
{
  icon: User,
  step: '1',
  title: 'Create Your Account',
  description: 'Sign up in seconds with your email. Complete your profile and you\'re ready to buy or sell.'
},
{
  icon: Package,
  step: '2',
  title: 'List or Browse',
  description: 'Sellers list items with photos and details. Buyers browse by category, location, or search.'
},
{
  icon: Gavel,
  step: '3',
  title: 'Bid or Buy',
  description: 'Place bids on auctions or buy fixed-price items instantly. Our anti-sniping system protects fair bidding.'
},
{
  icon: Trophy,
  step: '4',
  title: 'Win and Transact',
  description: 'Winners and sellers connect in a private transaction room to confirm details and arrange payment.'
},
{
  icon: CheckCircle2,
  step: '5',
  title: 'Complete the Deal',
  description: 'Seller ships, buyer confirms receipt. Leave reviews and build your reputation on the platform.'
}];


export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
          How It Works
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-5">
          Buy and Sell in 5 Steps
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Bidzo makes buying and selling simple, transparent, and fair for everyone.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6 mb-16">
        {STEPS.map(({ icon: Icon, step, title, description }) =>
        <div key={step} className="flex gap-6">
            <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-display font-bold text-lg shrink-0">
              {step}
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-xl font-display font-bold mb-2">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="bg-card rounded-2xl border p-8 sm:p-10 mb-10">
        <h2 className="text-2xl font-display font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Is there a fee to list?</h3>
            <p className="text-muted-foreground">New users get 3 free listings per month. After that, listings cost a small fee. Successful sales include a commission.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">How do I know if a seller is trustworthy?</h3>
            <p className="text-muted-foreground">Check their profile rating and reviews from past buyers. Bidzo also monitors all transactions and penalizes dishonest behavior.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What if I win an auction but change my mind?</h3>
            <p className="text-muted-foreground">You commit to buy when you bid. Backing out can result in a strike on your account. After 3 strikes, your account may be restricted.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">How is payment handled?</h3>
            <p className="text-muted-foreground">Buyers and sellers arrange payment directly in the transaction room. We recommend verified payment methods and secure shipping.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I cancel a listing?</h3>
            <p className="text-muted-foreground">Published listings cannot be edited or cancelled.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">
          Join the Latvian community of buyers and sellers making deals happen.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/browse">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6">
              Start Browsing <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/create">
            <Button variant="outline" className="gap-2 px-6">
              Create a Listing
            </Button>
          </Link>
        </div>
      </div>

    </div>);

}