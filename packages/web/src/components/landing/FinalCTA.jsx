export default function FinalCTA({ onCtaClick }) {
  return (
    <section className="bg-walnut text-cream py-20 text-center relative overflow-hidden" id="signup">
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(198,93,62,0.15)_0%,transparent_60%)]" />

      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6 relative">
        <h2 className="reveal font-display text-section md:text-[40px] font-semibold text-cream leading-[1.2] mb-4">
          Your family&apos;s pages<br />won&apos;t last forever.
        </h2>
        <p className="reveal delay-100 font-body text-base text-cream/60 mb-8 max-w-[300px] mx-auto">
          But what&apos;s written on them can. Start preserving the handwriting, recipes, and stories that make your family yours.
        </p>

        <div className="reveal delay-200">
          <button
            onClick={onCtaClick}
            className="font-ui text-base font-semibold py-3.5 px-8 bg-cream text-walnut rounded-pill border-none cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-[0.25s] shadow-btn-light tracking-[0.3px] hover:shadow-[0_6px_28px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 group"
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
          <p className="font-ui text-xs text-cream/30 mt-3 text-center">
            No credit card required &middot; 40 free scans
          </p>
        </div>
      </div>
    </section>
  );
}
