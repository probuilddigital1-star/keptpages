import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

export default function Nav({ onCtaClick, onLoginClick }) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isArticlesPage = location.pathname.startsWith('/between-the-pages');

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
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="font-display font-[800] text-[19px] sm:text-[22px] text-walnut tracking-[-0.5px] no-underline">
            Kept<span className="text-terracotta">Pages</span>
          </Link>
          <Link
            to="/between-the-pages"
            className={clsx(
              'hidden sm:inline font-ui text-[13px] font-medium tracking-[0.3px] no-underline transition-colors duration-200',
              isArticlesPage
                ? 'text-terracotta'
                : 'text-walnut-secondary hover:text-walnut'
            )}
          >
            Between the Pages
          </Link>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            to="/between-the-pages"
            className={clsx(
              'sm:hidden font-ui text-[13px] font-medium tracking-[0.3px] no-underline transition-colors duration-200',
              isArticlesPage
                ? 'text-terracotta'
                : 'text-walnut-secondary hover:text-walnut'
            )}
          >
            Guides
          </Link>
          <button
            onClick={onLoginClick}
            className="font-ui text-[13px] font-medium text-walnut-secondary tracking-[0.3px] bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-walnut py-1.5"
          >
            Log In
          </button>
          <button
            onClick={onCtaClick}
            className="font-ui text-[13px] font-semibold px-4 sm:px-[18px] py-2.5 sm:py-2 bg-walnut text-cream rounded-pill tracking-[0.3px] border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}
