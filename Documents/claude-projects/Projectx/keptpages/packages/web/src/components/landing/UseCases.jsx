export default function UseCases() {
  const cases = [
    {
      icon: '\uD83D\uDCDC',
      label: 'Recipe card',
      title: 'Recipe Cards',
      description: 'Handwritten family recipes, church cookbooks',
      delay: 'delay-200',
    },
    {
      icon: '\u2709\uFE0F',
      label: 'Letter',
      title: 'Old Letters',
      description: 'Love letters, wartime correspondence, postcards',
      delay: 'delay-300',
    },
    {
      icon: '\uD83D\uDCD3',
      label: 'Journal',
      title: 'Journals',
      description: 'Diaries, travel logs, personal notebooks',
      delay: 'delay-300',
    },
    {
      icon: '\uD83C\uDFA8',
      label: 'Art',
      title: "Children's Art",
      description: 'Drawings, stories, school projects',
      delay: 'delay-400',
    },
  ];

  return (
    <section className="section-padding bg-cream">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="section-label reveal">Beyond Recipes</div>
        <h2 className="font-display text-section md:text-section-lg font-semibold text-walnut mb-3 reveal delay-100">
          More than<br /><em className="font-normal italic">recipes.</em>
        </h2>
        <p className="font-body text-base text-walnut-secondary mb-10 max-w-[340px] reveal delay-200">
          Any page worth keeping is a page worth preserving.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-2">
          {cases.map((c) => (
            <div
              key={c.title}
              className={`reveal ${c.delay} bg-cream-surface p-[22px] px-[18px] rounded-md border border-border-light text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <span className="text-[32px] mb-2.5 block" role="img" aria-label={c.label}>
                {c.icon}
              </span>
              <h3 className="font-ui text-sm font-semibold text-walnut mb-1">
                {c.title}
              </h3>
              <p className="font-body text-[13px] text-walnut-muted leading-[1.45]">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
