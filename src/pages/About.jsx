import { Link } from 'react-router-dom';
import { ShieldCheck, Gavel, Users, Zap, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VALUES = [
{
  icon: ShieldCheck,
  title: 'Trust & Safety',
  description: 'Every listing goes through our review process. Buyers are protected by our trust system and dispute process.'
  },
  {
  icon: Gavel,
  title: 'Fair Auctions',
  description: 'Anti-sniping protection, transparent bid history, and automated auction resolution keep things honest for everyone.'
  },
  {
  icon: Users,
  title: 'Community First',
  description: 'Bidzo is built for the Latvian community, a local marketplace where real people buy and sell real things.'
  },
  {
  icon: Zap,
  title: 'Simple & Fast',
  description: 'List an item in minutes, bid in seconds. No hidden fees, no complicated processes, just clean, fast trading.'
}];


export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
          About Bidzo
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-5">
          Latvia's Online<br />Auction Marketplace
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Bidzo was created to give people in Latvia a modern, trustworthy platform to buy and sell through live auctions and fixed-price listings.
        </p>
      </div>

      {/* Story */}
      <div className="bg-card rounded-2xl border p-8 sm:p-10 mb-10">
        <h2 className="text-2xl font-display font-bold mb-4">Our Story</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>Bidzo didn’t start as a big plan it started with a simple realization. Buying and selling online felt slow. You list something, wait for messages, negotiate back and forth, and still end up unsure if you got the best deal. At the same time, something was missing in Latvia: a place where people could actually compete for items, where price isn’t guessed, but discovered.

          </p>
          <p>That’s where the idea came from. What if, instead of endless messaging and uncertainty, the market decided the price? What if selling felt faster, more engaging, even a little exciting? Bidzo was built around that idea, not to copy what already exists, but to create something that feels more alive, a place where sellers don’t have to worry about underpricing, buyers don’t have to chase deals endlessly, and every listing has the potential to turn into something real.

          </p>
          <p>This isn’t just about auctions. It’s about changing how people interact when they buy and sell, making it more transparent, more dynamic, and more fair. We’re starting small, but the goal is simple: to build a marketplace people actually enjoy using, not just tolerate. And this is just the beginning.

          </p>
        </div>
      </div>

      {/* Values */}
      <div className="mb-10">
        <h2 className="text-2xl font-display font-bold mb-6">What We Stand For</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VALUES.map(({ icon: Icon, title, description }) =>
          <div key={title} className="bg-card rounded-xl border p-6 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">Ready to start?</h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of buyers and sellers on Latvia's fastest-growing auction platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/browse">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6">
              Browse Listings <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="mailto:support@bidzo.lv">
            <Button variant="outline" className="gap-2 px-6">
              <Mail className="w-4 h-4" />
              Contact Us
            </Button>
          </a>
        </div>
      </div>

    </div>);

}