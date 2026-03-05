export default function BookPreview({ onCtaClick }) {
  return (
    <section className="section-padding bg-cream-alt relative overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="section-label reveal text-center">The Finished Product</div>
        <h2 className="font-display text-section md:text-section-lg font-semibold text-walnut mb-3 text-center reveal delay-100">
          From phone<br />to <em className="font-normal italic">bookshelf.</em>
        </h2>

        <div className="flex flex-col items-center mt-10 mb-8">
          {/* 3D Book */}
          <div className="reveal delay-200 w-[200px] h-[270px] md:w-[240px] md:h-[320px] relative mb-8 [perspective:800px]">
            <div
              className="w-full h-full rounded-[2px_10px_10px_2px] [transform:rotateY(-18deg)] origin-left relative flex flex-col items-center justify-center p-[30px_24px] overflow-hidden transition-transform duration-[0.4s] hover:[transform:rotateY(-10deg)] group"
              style={{
                background: 'linear-gradient(145deg, #C65D3E 0%, #8B3520 100%)',
                boxShadow:
                  '6px 6px 20px rgba(44,24,16,0.25), 2px 0 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* Spine shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-[18px] bg-gradient-to-r from-black/25 via-black/5 to-transparent" />
              {/* Decorative border */}
              <div className="absolute inset-3.5 border border-white/15 rounded-[2px_6px_6px_2px] pointer-events-none" />

              <div className="w-[30px] h-px bg-white/30 mb-4" />
              <div className="font-display font-semibold text-[17px] text-white/95 text-center leading-[1.3] mb-1.5">
                The Rose Family<br />Cookbook
              </div>
              <div className="font-body italic text-[11px] text-white/55 text-center leading-[1.4]">
                Recipes Handed Down<br />Through Generations
              </div>
              <div className="w-5 h-px bg-white/20 mt-4" />
            </div>

            {/* Page edges */}
            <div
              className="absolute -right-1.5 top-1.5 bottom-1.5 w-3 rounded-[0_2px_2px_0] [transform:rotateY(-18deg)] origin-left transition-transform duration-[0.4s]"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, #FFFDF7 0px, #FFFDF7 1.5px, #E5D9C8 1.5px, #E5D9C8 2px)',
              }}
            />
          </div>

          {/* Description */}
          <div className="text-center reveal delay-300">
            <h3 className="font-display text-lg font-semibold text-walnut mb-2">
              A book they&apos;ll treasure
            </h3>
            <p className="font-body text-[15px] text-walnut-secondary leading-[1.55] max-w-[320px]">
              Turn your collection into a gorgeous hardcover &mdash; shipped to your door or gifted to family. Every copy is printed on demand, just&nbsp;for&nbsp;you.
            </p>
            <div className="inline-flex items-center gap-2 font-ui text-sm font-medium text-walnut-secondary mt-4 py-2 px-[18px] bg-cream-surface rounded-pill border border-border-light">
              Hardcover from <strong className="text-walnut font-semibold">$79</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
