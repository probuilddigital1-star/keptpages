export default function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Snap a Photo',
      description:
        'Point your phone at any handwritten page. Recipe cards, letters, journal entries \u2014 we handle it all.',
      delay: 'delay-200',
    },
    {
      number: '2',
      title: 'AI Extracts Every Word',
      description:
        'Our AI reads even faded cursive with 95%+ accuracy. Ingredients, instructions, notes \u2014 all structured instantly.',
      delay: 'delay-300',
    },
    {
      number: '3',
      title: 'Keep & Print',
      description:
        'Edit, organize into collections, and print gorgeous hardcover books \u2014 or share digitally with your whole family.',
      delay: 'delay-400',
    },
  ];

  return (
    <section className="section-padding bg-cream-alt relative">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="section-label reveal">How It Works</div>
        <h2 className="font-display text-section md:text-section-lg font-semibold text-walnut mb-3 reveal delay-100">
          Three steps<br />to <em className="font-normal italic">forever.</em>
        </h2>
        <p className="font-body text-base text-walnut-secondary mb-10 max-w-[340px] reveal delay-200">
          No scanning hardware needed. Just your phone.
        </p>

        <div className="flex flex-col gap-5 md:gap-4 mt-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`reveal ${step.delay} bg-cream-surface p-6 rounded-md border border-border-light shadow-sm flex gap-[18px] items-start transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="font-display font-[800] text-[32px] text-terracotta leading-none opacity-30 shrink-0 w-9">
                {step.number}
              </div>
              <div>
                <h3 className="font-ui text-[17px] font-semibold text-walnut mb-1">
                  {step.title}
                </h3>
                <p className="font-body text-[15px] text-walnut-secondary leading-[1.55]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
