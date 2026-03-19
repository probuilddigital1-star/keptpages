import { useState, useEffect, useCallback } from 'react';

export default function ScrollCue() {
  const [visible, setVisible] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);

  // Fade in after hero animations complete
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fade out on scroll
  useEffect(() => {
    function handleScroll() {
      setScrolledAway(window.scrollY > 80);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = useCallback(() => {
    const target = document.getElementById('trust-bar');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Scroll to see more"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer transition-opacity duration-500 ${
        visible && !scrolledAway ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Decorative line */}
      <div className="w-[60px] h-px bg-terracotta/20" />

      {/* Circle with chevron */}
      <div className="w-7 h-7 rounded-full bg-terracotta-light border border-terracotta-glow flex items-center justify-center animate-gentle-pulse">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-3.5 h-3.5 text-terracotta"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Text */}
      <span className="font-body italic text-[13px] text-walnut-muted tracking-[0.2px]">
        See the magic below
      </span>
    </div>
  );
}
