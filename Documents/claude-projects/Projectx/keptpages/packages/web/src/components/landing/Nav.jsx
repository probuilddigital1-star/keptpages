import { useState, useEffect } from 'react';
import clsx from 'clsx';

export default function Nav({ onCtaClick }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={clsx(
        'fixed top-[3px] left-0 right-0 z-[1000] transition-all duration-300',
        scrolled
          ? 'bg-cream/95 backdrop-blur-[12px] shadow-[0_1px_8px_rgba(44,24,16,0.06)] py-2.5'
          : 'bg-transparent py-3.5'
      )}
    >
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6 flex items-center justify-between">
        <div className="font-display font-[800] text-[22px] text-walnut tracking-[-0.5px]">
          Kept<span className="text-terracotta">Pages</span>
        </div>
        <button
          onClick={onCtaClick}
          className="font-ui text-[13px] font-semibold px-[18px] py-2 bg-walnut text-cream rounded-pill tracking-[0.3px] border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}
