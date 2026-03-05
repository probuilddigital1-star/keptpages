export default function TrustBar() {
  const items = [
    {
      label: '95%+ Accuracy',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[15px] h-[15px] text-sage shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
    },
    {
      label: 'Private & Secure',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[15px] h-[15px] text-sage shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      label: 'Free to Start',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[15px] h-[15px] text-sage shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="py-8 border-t border-b border-border-light bg-cream-warm">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="flex justify-center gap-6 flex-wrap">
          {items.map((item) => (
            <div
              key={item.label}
              className="font-ui text-[12.5px] font-medium text-walnut-secondary flex items-center gap-1.5 tracking-[0.3px]"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
