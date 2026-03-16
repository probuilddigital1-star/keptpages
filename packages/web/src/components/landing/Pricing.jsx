import { BOOK_TIERS, BOOK_ADDONS, BOOK_PRICING, PLANS } from '@/config/plans';

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-sage shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const TIER_SPECS = {
  classic: {
    specs: ['Softcover', 'B&W interior', 'Standard 60# paper'],
  },
  premium: {
    specs: ['Hardcover', 'Full color interior', 'Standard 60# paper'],
  },
  heirloom: {
    specs: ['Hardcover', 'Full color interior', 'Premium 80# paper'],
  },
};

const ADDON_DISPLAY = [
  { key: 'glossy', text: 'Add glossy cover finish', detail: 'free' },
  { key: 'coil', text: 'Add coil binding', detail: '+$8', note: 'lays flat for kitchen use' },
  { key: 'color', text: 'Add color interior', detail: '+$10', note: 'Classic only' },
];

function formatPrice(cents) {
  return `$${Math.floor(cents / 100)}`;
}

function BookTierCard({ tierId, tier }) {
  const specs = TIER_SPECS[tierId];
  const isFeatured = tier.featured;
  const extraPageCost = `+$${(BOOK_PRICING.perExtraPage / 100).toFixed(2)}`;

  return (
    <div
      className={`relative flex flex-col rounded-lg border shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-cream-surface overflow-hidden ${
        isFeatured
          ? 'border-terracotta border-2 lg:scale-105 lg:z-10'
          : 'border-border-light'
      }`}
    >
      {isFeatured && (
        <div className="bg-terracotta text-white text-center font-ui text-xs font-semibold tracking-wide uppercase py-1.5 px-3">
          Most Popular
        </div>
      )}

      <div className={`flex flex-col flex-1 p-6 ${isFeatured ? '' : 'pt-6'}`}>
        {/* Icon + Name */}
        <div className="flex items-center gap-2 mb-3">
          <span className={isFeatured ? 'text-terracotta' : 'text-walnut-muted'}>
            <BookIcon />
          </span>
          <h3 className="font-ui text-lg font-semibold text-walnut">
            {tier.label}
          </h3>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className="font-display text-[42px] font-[800] text-walnut leading-[1.1]">
            {formatPrice(tier.price)}
          </span>
          <span className="font-ui text-sm text-walnut-muted ml-1.5">/book</span>
        </div>

        {/* Description */}
        <p className="font-body text-sm text-walnut-secondary mb-4">
          {tier.description}
        </p>

        {/* Specs */}
        <ul className="list-none space-y-2 mb-4 flex-1">
          {specs.specs.map((spec) => (
            <li key={spec} className="font-ui text-[14px] flex items-center gap-2 text-walnut-secondary">
              <CheckIcon />
              {spec}
            </li>
          ))}
          <li className="font-ui text-[14px] flex items-center gap-2 text-walnut-secondary">
            <CheckIcon />
            {BOOK_PRICING.freePages} pages included
          </li>
        </ul>

        {/* Extra page cost */}
        <p className="font-ui text-xs text-walnut-muted mt-auto pt-2 border-t border-border-light">
          {extraPageCost}/page over {BOOK_PRICING.freePages}
        </p>
      </div>
    </div>
  );
}

export default function Pricing({ onCtaClick }) {
  const keeperPass = PLANS.KEEPER_PASS;

  return (
    <section className="section-padding bg-cream" id="pricing">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-xl px-6">
        {/* Section header */}
        <div className="section-label reveal text-center">Pricing</div>
        <h2 className="font-display text-section md:text-section-lg font-semibold text-walnut mb-3 text-center reveal delay-100">
          Beautiful books,<br /><em className="font-normal italic">honest prices.</em>
        </h2>
        <p className="font-body text-base text-walnut-secondary mb-12 text-center mx-auto max-w-[400px] reveal delay-200">
          Scan for free. Pay only when you print.
        </p>

        {/* Book tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-start mb-10 reveal delay-300 max-w-3xl mx-auto">
          {Object.entries(BOOK_TIERS).map(([id, tier]) => (
            <BookTierCard key={id} tierId={id} tier={tier} />
          ))}
        </div>

        {/* Add-ons */}
        <div className="max-w-2xl mx-auto mb-10 reveal delay-300">
          <h3 className="font-ui text-sm font-semibold tracking-wide uppercase text-walnut-muted mb-3 text-center">
            Customize Your Book
          </h3>
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3">
            {ADDON_DISPLAY.map((addon) => (
              <div
                key={addon.key}
                className="flex items-center gap-2 bg-cream-surface border border-border-light rounded-md px-4 py-2.5 text-sm"
              >
                <CheckIcon />
                <span className="font-ui text-walnut-secondary">
                  {addon.text}{' '}
                  <span className={`font-semibold ${addon.detail === 'free' ? 'text-sage' : 'text-walnut'}`}>
                    ({addon.detail})
                  </span>
                  {addon.note && (
                    <span className="text-walnut-muted"> — {addon.note}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keeper Pass callout */}
        <div className="max-w-2xl mx-auto mb-10 reveal delay-400">
          <div className="bg-terracotta-light border border-terracotta/20 rounded-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-xl md:text-2xl font-bold text-walnut mb-1">
                  Keeper Pass
                </h3>
                <p className="font-ui text-xs font-medium text-walnut-muted tracking-wide uppercase">
                  One-time purchase — not a subscription
                </p>
              </div>
              <div className="font-display text-[36px] font-[800] text-terracotta leading-none shrink-0">
                ${keeperPass.price}
              </div>
            </div>
            <ul className="list-none grid grid-cols-1 sm:grid-cols-2 gap-2">
              {keeperPass.features.map((feature) => (
                <li key={feature} className="font-ui text-[14px] flex items-center gap-2 text-walnut-secondary">
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Free tier message */}
        <p className="font-body text-sm text-walnut-muted text-center mb-6 reveal delay-400">
          Start free — 40 scans, no credit card required
        </p>

        {/* CTA */}
        <div className="text-center reveal delay-500">
          <button
            onClick={onCtaClick}
            className="font-ui text-base font-semibold py-4 px-9 bg-terracotta text-white rounded-pill border-none cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-[0.25s] shadow-btn-primary tracking-[0.3px] hover:bg-terracotta-hover hover:-translate-y-0.5 hover:shadow-btn-primary-hover active:translate-y-0 group"
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
    </section>
  );
}
