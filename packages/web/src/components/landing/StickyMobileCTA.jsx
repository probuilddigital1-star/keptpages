import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function StickyMobileCTA({ onCtaClick, onLoginClick }) {
  const [visible, setVisible] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    function handleScroll() {
      const hero = document.querySelector('[data-hero]');
      if (!hero) return;
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      setVisible(window.scrollY > heroBottom - 100);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 bg-cream/95 backdrop-blur-[12px] border-t border-border py-3 pb-[max(12px,env(safe-area-inset-bottom))] px-4 sm:px-[22px] z-[999] flex items-center justify-between transition-transform duration-[0.35s] lg:hidden',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="font-display text-[15px] font-semibold text-walnut">
        KeptPages
        <span className="block font-ui text-[11px] font-normal text-walnut-muted">
          Free to start &middot; No credit card
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onLoginClick}
          className="font-ui text-[13px] font-medium text-walnut-secondary bg-transparent border-none cursor-pointer whitespace-nowrap transition-colors duration-200 hover:text-walnut"
        >
          Log In
        </button>
        <button
          onClick={onCtaClick}
          className="font-ui text-sm font-semibold py-2.5 px-[22px] bg-terracotta text-white rounded-pill border-none cursor-pointer whitespace-nowrap transition-colors duration-200 hover:bg-terracotta-hover"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
