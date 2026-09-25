import { useRef } from 'react';

// Horizontal snap-scroll row with prev/next controls. Children are the cards.
export default function Scroller({ children, itemClass = 'w-[260px] sm:w-[320px]' }) {
  const ref = useRef(null);
  const by = (dir) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: 'smooth' });
  const kids = Array.isArray(children) ? children : [children];

  return (
    <div className="group relative">
      <button
        onClick={() => by(-1)}
        className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 shadow-md hover:bg-slate-50 sm:block"
        aria-label="Scroll left"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div ref={ref} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 scroll-pl-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {kids.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClass}`}>{child}</div>
        ))}
      </div>
      <button
        onClick={() => by(1)}
        className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 shadow-md hover:bg-slate-50 sm:block"
        aria-label="Scroll right"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}
