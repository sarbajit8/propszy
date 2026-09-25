import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchAutocomplete from './SearchAutocomplete';

const enc = encodeURIComponent;

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=70',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=70',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=70',
];

const TABS = [
  { key: 'buy', label: 'Buy', base: '/projects', params: {} },
  { key: 'rent', label: 'Rent', base: '/properties', params: {} },
  { key: 'new', label: 'New Launch', base: '/projects', params: { status: 'UPCOMING' } },
  { key: 'ready', label: 'Ready to Move', base: '/projects', params: { status: 'READY_TO_MOVE' } },
  { key: 'commercial', label: 'Commercial', base: '/projects', params: { type: 'COMMERCIAL' } },
  { key: 'plots', label: 'Plots / Land', base: '/projects', params: { type: 'PLOT' } },
];

const TYPES = [
  ['', 'All Residential'],
  ['RESIDENTIAL', 'Residential'],
  ['COMMERCIAL', 'Commercial'],
  ['PLOT', 'Plots / Land'],
  ['MIXED', 'Mixed-use'],
];

export default function HeroSearch({ cities = [], banners = [] }) {
  const [tab, setTab] = useState('buy');
  const [propType, setPropType] = useState('');

  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const extra = { ...active.params, ...(propType ? { type: propType } : {}) };

  // hero image slider
  const photos = banners.map((b) => b.imageUrl).filter(Boolean).length
    ? banners.map((b) => b.imageUrl).filter(Boolean)
    : DEFAULT_PHOTOS;
  const [slide, setSlide] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    if (photos.length < 2) return undefined;
    timer.current = setInterval(() => setSlide((s) => (s + 1) % photos.length), 5000);
    return () => clearInterval(timer.current);
  }, [photos.length]);
  const go = (dir) => {
    setSlide((s) => (s + dir + photos.length) % photos.length);
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  };

  return (
    <section className="relative -mt-16 bg-white">
      {/* image slider */}
      <div className="relative h-[320px] w-full overflow-hidden bg-slate-800 sm:h-[460px]">
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms]"
            style={{ opacity: i === slide ? 1 : 0 }}
          />
        ))}
        {/* top scrim so the navbar stays legible */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />

        {photos.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous"
              className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur hover:bg-white sm:left-6 sm:h-11 sm:w-11">
              <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => go(1)} aria-label="Next"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur hover:bg-white sm:right-6 sm:h-11 sm:w-11">
              <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        )}
      </div>

      {/* search panel — overlaps the bottom of the slider */}
      <div className="container-app relative">
        <div className="mx-auto -mt-16 max-w-5xl rounded-2xl bg-white p-1.5 shadow-2xl sm:-mt-20">
          {/* tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 px-1 sm:px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`relative whitespace-nowrap px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-semibold transition ${
                  tab === tb.key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tb.label}
                {tb.key === 'new' && <span className="absolute right-1 top-2 sm:right-2 sm:top-2.5 h-1.5 w-1.5 rounded-full bg-rose-500" />}
                {tab === tb.key && <span className="absolute inset-x-2 sm:inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600" />}
              </button>
            ))}
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            <Link
              to="/account/properties/new"
              className="ml-auto hidden sm:flex items-center gap-1.5 whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-slate-600 hover:text-brand-700"
            >
              Post Property <span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">FREE</span>
            </Link>
          </div>

          {/* search row */}
          <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
            <select
              value={propType}
              onChange={(e) => setPropType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 focus:border-brand-500 focus:outline-none sm:w-44 sm:shrink-0 sm:border-0 sm:border-r sm:border-slate-200 sm:bg-transparent sm:py-3"
            >
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <SearchAutocomplete
              bare
              className="flex-1"
              basePath={active.base}
              extraParams={extra}
              inputClassName="py-2 sm:py-3 text-xs sm:text-sm"
              placeholder="Search city, project or builder…"
            />
          </div>
        </div>
      </div>

      {/* trending row + dots */}
      <div className="container-app pb-6 pt-3.5 sm:pb-8 sm:pt-5 text-center">
        {cities.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <span className="font-medium text-slate-400">Trending:</span>
            {cities.slice(0, 6).map((c) => (
              <Link
                key={c.name}
                to={`/projects?city=${enc(c.name)}`}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <div className="mt-3 sm:mt-4 flex justify-center gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => { setSlide(i); if (timer.current) { clearInterval(timer.current); timer.current = null; } }}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${i === slide ? 'w-5 sm:w-6 bg-brand-600' : 'w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
