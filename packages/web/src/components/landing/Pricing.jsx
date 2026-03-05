const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-sage shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function Pricing({ onCtaClick }) {
  const freeFeatures = [
    '25 free scans',
    '1 collection',
    'PDF export',
    'No credit card required',
  ];

  return (
    <section className="section-padding bg-cream" id="pricing">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="section-label reveal text-center">Simple Pricing</div>
        <h2 className="font-display text-section md:text-section-lg font-semibold text-walnut mb-3 text-center reveal delay-100">
          Start free.<br /><em className="font-normal italic">Upgrade when ready.</em>
        </h2>
        <p className="font-body text-base text-walnut-secondary mb-10 max-w-[340px] text-center mx-auto reveal delay-200">
          No tricks, no hidden fees. Pay only for what you need.
        </p>

        <div className="reveal delay-300 bg-cream-surface rounded-lg border border-border-light shadow-md overflow-hidden">
          {/* Free Tier */}
          <div className="p-8 px-6 border-b border-border-light">
            <h3 className="font-ui text-[13px] font-semibold tracking-[1.5px] uppercase text-walnut-muted mb-1.5">
              Free Forever
            </h3>
            <div className="font-display text-[42px] font-[800] text-walnut leading-[1.1] mb-5">
              $0 <span className="text-lg font-normal text-walnut-muted">to start</span>
            </div>
            <ul className="list-none">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="font-ui text-[15px] py-[7px] flex items-center gap-2.5 text-walnut-secondary"
                >
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade Tier */}
          <div className="p-6 bg-terracotta-light">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div>
                <h4 className="font-ui text-[15px] font-semibold text-walnut mb-0.5">
                  Keeper Plan
                </h4>
                <p className="font-body text-[13px] text-walnut-secondary">
                  Unlimited scans, collections &amp; sharing
                </p>
              </div>
              <div className="font-display text-[22px] font-bold text-terracotta">
                $39.99 <span className="font-ui text-xs font-normal text-walnut-muted">/yr</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-6 text-center">
            <button
              onClick={onCtaClick}
              className="w-full font-ui text-base font-semibold py-4 px-9 bg-terracotta text-white rounded-pill border-none cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-[0.25s] shadow-btn-primary tracking-[0.3px] hover:bg-terracotta-hover hover:-translate-y-0.5 hover:shadow-btn-primary-hover active:translate-y-0 group"
            >
              Get Started Free
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
          </div>
        </div>
      </div>
    </section>
  );
}
