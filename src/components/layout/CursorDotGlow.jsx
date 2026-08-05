import { useEffect } from 'react';

// Drives the cursor-following dot-glow effect defined in index.css
// (.page-ambient-bg::before). Mounted once in AppLayout so every page
// gets the effect automatically via the shared page-ambient-bg marker
// class in lib/pageBackground.js -- no per-page wiring needed.
export default function CursorDotGlow() {
  useEffect(() => {
    let raf = null;
    let current = null;

    const clear = () => {
      if (current) {
        current.style.setProperty('--glow-x', '-9999px');
        current.style.setProperty('--glow-y', '-9999px');
      }
      current = null;
    };

    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = document.querySelector('.page-ambient-bg');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
          clear();
          return;
        }
        if (current && current !== el) clear();
        current = el;
        el.style.setProperty('--glow-x', `${x}px`);
        el.style.setProperty('--glow-y', `${y}px`);
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', clear);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', clear);
      if (raf) cancelAnimationFrame(raf);
      clear();
    };
  }, []);

  return null;
}
