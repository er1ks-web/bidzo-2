// Shared ambient background for top-level pages: subtle corner glows (using
// the brand accent color) plus a fine dot-grid texture, kept out of the
// center so it never competes with page content. Single source of truth so
// every page stays visually consistent and can be tweaked in one place.
export const pageBackgroundStyle = {
  backgroundImage: [
    'radial-gradient(circle at 0% 0%, hsl(var(--accent) / 0.05), transparent 40%)',
    'radial-gradient(circle at 100% 100%, hsl(var(--accent) / 0.04), transparent 40%)',
    'radial-gradient(hsl(var(--foreground) / 0.035) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '100% 100%, 100% 100%, 22px 22px',
};

// Pair with this className on the wrapper -- without an explicit height, a
// plain block div only stretches to fit its own content, so on a short page
// the gradient would only cover part of the page, leaving a visible seam
// where it cuts off before the actual bottom of the viewport.
//
// min-h-full was tried first but depends on every ancestor in the chain
// (including the flex-1 <main> from AppLayout) resolving to a real height
// for percentage-height to work, and that wasn't holding up reliably in
// practice -- hence the visible seams. min-h-screen (100vh) doesn't depend
// on any ancestor at all, so it's guaranteed to cover the full viewport
// regardless of layout structure.
export const pageBackgroundClassName = 'min-h-screen';
