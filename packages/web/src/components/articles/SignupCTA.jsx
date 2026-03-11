import { Link } from 'react-router-dom';

export default function SignupCTA({ variant = 'end' }) {
  const isInline = variant === 'inline';

  return (
    <div
      className={`bg-cream-warm border border-border-light rounded-lg text-center ${
        isInline ? 'px-6 py-6 my-8' : 'px-6 sm:px-10 py-8 sm:py-10 mt-12'
      }`}
    >
      <h3 className={`font-display font-semibold text-walnut mb-2 ${isInline ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
        Start preserving your family's story
      </h3>
      <p className={`font-body text-walnut-secondary mb-5 max-w-md mx-auto ${isInline ? 'text-sm' : 'text-base'}`}>
        Turn old recipe cards, letters, and journals into beautiful keepsakes your family will treasure for generations.
      </p>
      <Link
        to="/signup"
        className="inline-block font-ui text-[13px] font-semibold px-6 py-2.5 bg-terracotta text-cream rounded-pill no-underline transition-all duration-200 hover:-translate-y-px hover:shadow-btn-primary-hover"
      >
        Get Started Free
      </Link>
    </div>
  );
}
