export default function Hero({ onCtaClick, onLoginClick }) {
  const words = [
    { text: 'Every ', highlight: false },
    { text: 'family ', highlight: false },
    { text: 'has ', highlight: false },
    { text: 'pages ', highlight: false },
    { text: 'worth ', highlight: true },
    { text: 'keeping.', highlight: true },
  ];

  const delays = ['0.3s', '0.38s', '0.46s', '0.58s', '0.66s', '0.74s'];

  return (
    <section className="pt-[120px] pb-[60px] min-h-[100svh] flex items-center bg-[radial-gradient(ellipse_at_50%_0%,rgba(198,93,62,0.04)_0%,transparent_60%)]">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div
          className="font-ui text-section-label uppercase tracking-[2.5px] text-terracotta mb-5 opacity-0 animate-[fadeInUp_0.6s_ease_0.2s_forwards]"
        >
          Preserve What Matters
        </div>

        <h1 className="font-display text-hero md:text-hero-lg lg:text-hero-xl tracking-[-0.5px] mb-[22px] text-walnut">
          {words.map((word, i) => (
            <span key={i}>
              {i > 0 && ' '}
              <span
                className={`inline-block opacity-0 translate-y-5 animate-[fadeInUp_0.5s_ease_forwards] ${
                  word.highlight ? 'text-terracotta relative' : ''
                }`}
                style={{ animationDelay: delays[i] }}
              >
                {word.highlight && (
                  <span className="absolute bottom-0.5 -left-0.5 -right-0.5 h-2 bg-terracotta-light rounded z-[-1]" />
                )}
                {word.text.trim()}
              </span>
            </span>
          ))}
        </h1>

        <p className="font-body text-[17px] md:text-[19px] leading-[1.65] text-walnut-secondary mb-8 max-w-[360px] md:max-w-[480px] opacity-0 animate-[fadeInUp_0.6s_ease_0.85s_forwards]">
          Snap a photo of grandma&apos;s handwritten recipes, old letters, or any
          cherished document. Our AI preserves every word&nbsp;&mdash;&nbsp;beautifully.
        </p>

        <div className="opacity-0 animate-[fadeInUp_0.6s_ease_1s_forwards]">
          <button
            onClick={onCtaClick}
            className="font-ui text-base font-semibold py-4 px-9 bg-terracotta text-white rounded-pill border-none cursor-pointer inline-flex items-center gap-2 transition-all duration-[0.25s] shadow-btn-primary tracking-[0.3px] hover:bg-terracotta-hover hover:-translate-y-0.5 hover:shadow-btn-primary-hover active:translate-y-0 group"
          >
            Start Preserving &mdash; Free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-[3px]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <p className="font-ui text-[13px] text-walnut-muted mt-3.5 tracking-[0.2px]">
            No credit card required <span className="mx-1.5 opacity-40">&middot;</span> 25 free scans
          </p>
          <p className="font-ui text-[13px] text-walnut-muted mt-2 tracking-[0.2px]">
            Already have an account?{' '}
            <button
              onClick={onLoginClick}
              className="font-ui text-[13px] text-terracotta font-medium bg-transparent border-none cursor-pointer p-0 underline underline-offset-2 decoration-terracotta/40 hover:decoration-terracotta transition-colors duration-200"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
