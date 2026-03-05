export default function TransformSection() {
  return (
    <section className="py-20 bg-cream">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="section-label reveal">The Magic</div>
        <h2 className="font-display text-section md:text-section-lg font-semibold text-walnut mb-3 reveal delay-100">
          From faded ink<br />to <em className="font-normal italic">forever.</em>
        </h2>
        <p className="font-body text-base text-walnut-secondary mb-10 max-w-[340px] reveal delay-200">
          See what happens when AI meets your family&apos;s handwriting.
        </p>

        <div className="lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
          {/* Before Card */}
          <div
            className="reveal delay-300 relative rounded-[2px] p-7 pr-[22px] pb-6 rotate-[-1.2deg] animate-float mb-2 lg:mb-0"
            style={{
              background: '#F0E2C8',
              backgroundImage:
                'repeating-linear-gradient(transparent, transparent 29px, rgba(139,90,43,0.12) 29px, rgba(139,90,43,0.12) 30px)',
              boxShadow:
                '2px 3px 8px rgba(44,24,16,0.1), inset 0 0 40px rgba(139,90,43,0.05)',
            }}
          >
            {/* Tape */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-1 w-20 h-[22px] z-[2]"
              style={{
                background: 'rgba(255,252,220,0.55)',
                border: '1px solid rgba(200,190,150,0.3)',
              }}
            />
            {/* Coffee stain */}
            <div
              className="absolute top-3 right-[18px] w-[70px] h-[55px] rounded-full rotate-[15deg]"
              style={{
                background: 'radial-gradient(ellipse, rgba(139,90,43,0.12) 0%, transparent 70%)',
              }}
            />
            {/* Edge darkening */}
            <div
              className="absolute inset-0 rounded-[2px] pointer-events-none"
              style={{
                background:
                  'linear-gradient(to right, rgba(100,60,20,0.06), transparent 15%, transparent 85%, rgba(100,60,20,0.06)), linear-gradient(to bottom, rgba(100,60,20,0.04), transparent 10%, transparent 90%, rgba(100,60,20,0.06))',
              }}
            />

            <div className="font-ui text-[10px] font-semibold tracking-[2px] uppercase text-walnut-muted mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Original
            </div>
            <div className="font-handwriting text-[26px] font-semibold text-[#3D2B1F] mb-1.5 leading-[1.2]">
              Grandma Rose&apos;s Apple Pie
            </div>
            <div className="font-handwriting text-[18px] text-[#4A3728] leading-[1.67] relative z-[1]">
              2 cups flour<br />
              1 cup butter (cold!)<br />
              6 apples - Granny Smith<br />
              3/4 cup sugar<br />
              1 tsp cinnamon<br />
              <span className="opacity-65">pinch of nutmeg</span><br /><br />
              Mix flour &amp; butter til crumbly.<br />
              Press into pan. Peel &amp; slice<br />
              apples thin. Mix with sugar<br />
              &amp; spices. <span className="opacity-65">Pile high in crust.</span><br />
              Dot with butter. Top crust &mdash;<br />
              pinch edges. 375&deg; for 45 min.
            </div>
            <div className="font-handwriting text-base text-[#6B4D35] mt-3 pt-2.5 border-t border-dashed border-[rgba(139,90,43,0.2)] italic">
              * Use tart apples!! Sweet ones make it too sugary &mdash; Mom always said this was Nana&apos;s secret.
            </div>
          </div>

          {/* Arrow */}
          <div className="reveal delay-300 flex items-center justify-center gap-3 py-6 text-terracotta lg:flex-col lg:py-0">
            <div className="w-8 h-px bg-border lg:w-px lg:h-8" />
            <div className="w-11 h-11 rounded-full bg-terracotta-light border-[1.5px] border-terracotta-glow flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px] text-terracotta">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-ui text-[11px] font-semibold tracking-[1.5px] uppercase text-terracotta">
              AI Magic
            </span>
            <div className="w-8 h-px bg-border lg:w-px lg:h-8" />
          </div>

          {/* After Card */}
          <div className="reveal delay-400 bg-cream-surface p-8 px-6 pb-7 rounded-sm shadow-lg border border-border-light relative overflow-hidden">
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-terracotta to-gold" />

            <div className="font-ui text-[10px] font-semibold tracking-[2px] uppercase text-sage mb-[18px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage" />
              Preserved
            </div>

            <div className="font-display text-2xl font-semibold text-walnut mb-1 leading-[1.2]">
              Grandma Rose&apos;s Apple Pie
            </div>
            <div className="font-body text-sm italic text-walnut-muted mb-5">
              From the Rose Family Collection
            </div>
            <div className="w-10 h-[1.5px] bg-terracotta mb-5" />

            <div className="font-ui text-[10px] font-semibold tracking-[2px] uppercase text-walnut-muted mb-2.5">
              Ingredients
            </div>
            <ul className="list-none mb-[22px]">
              {[
                ['2 cups', 'flour'],
                ['1 cup', 'butter, cold'],
                ['6', 'Granny Smith apples'],
                ['\u00BE cup', 'sugar'],
                ['1 tsp', 'cinnamon'],
                ['pinch', 'nutmeg'],
              ].map(([qty, name]) => (
                <li
                  key={name}
                  className="font-body text-[15px] py-1 flex items-baseline gap-2 text-walnut leading-[1.45]"
                >
                  <span className="w-1 h-1 rounded-full bg-terracotta shrink-0 mt-[7px]" />
                  <span className="font-ui font-medium text-sm text-walnut-secondary min-w-[70px]">
                    {qty}
                  </span>
                  {name}
                </li>
              ))}
            </ul>

            <div className="font-ui text-[10px] font-semibold tracking-[2px] uppercase text-walnut-muted mb-2.5">
              Instructions
            </div>
            <ol className="list-none mb-5 [counter-reset:steps]">
              {[
                'Mix flour and butter until crumbly. Press into pan.',
                'Peel and thinly slice apples. Toss with sugar, cinnamon, and nutmeg.',
                'Pile filling high in crust. Dot with butter.',
                'Add top crust and pinch edges to seal. Bake at 375\u00B0F for 45 minutes.',
              ].map((step, i) => (
                <li
                  key={i}
                  className="font-body text-[15px] py-1.5 flex gap-3 text-walnut leading-[1.55] [counter-increment:steps]"
                >
                  <span className="font-ui font-semibold text-xs w-[22px] h-[22px] rounded-full bg-terracotta-light text-terracotta flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="bg-gold-light p-3 px-4 rounded-sm text-sm text-walnut-secondary border-l-[3px] border-gold italic leading-[1.5]">
              <strong className="font-ui font-semibold text-[11px] tracking-[1px] uppercase text-gold block mb-1 not-italic">
                Family Note
              </strong>
              Use tart apples &mdash; sweet ones make it too sugary. Mom always said this was Nana&apos;s secret.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
