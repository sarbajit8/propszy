import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchAutocomplete from './SearchAutocomplete';

const enc = encodeURIComponent;

const TABS = [
  { key: 'buy', label: 'Buy', base: '/projects', params: {} },
  { key: 'rent', label: 'Rent', base: '/properties', params: {} },
  { key: 'new', label: 'New Launch', base: '/projects', params: { status: 'UPCOMING' } },
  { key: 'commercial', label: 'Commercial', base: '/projects', params: { type: 'COMMERCIAL' } },
  { key: 'plots', label: 'Plots/Land', base: '/projects', params: { type: 'PLOT' } },
  { key: 'ready', label: 'Ready to Move', base: '/projects', params: { status: 'READY_TO_MOVE' } },
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
  const [slide, setSlide] = useState(0);
  const timer = useRef(null);

  const slides = banners.filter((b) => b.imageUrl);
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return undefined;
    timer.current = setInterval(() => setSlide((s) => (s + 1) % n), 6000);
    return () => clearInterval(timer.current);
  }, [n]);

  const go = (dir) => {
    setSlide((s) => (s + dir + n) % n);
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  };

  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const extra = { ...active.params, ...(propType ? { type: propType } : {}) };

  return (
    <section className="-mt-16 bg-white">
      {/* image slider — runs up behind the transparent navbar */}
      <div className="relative">
        <div className="relative h-[360px] w-full overflow-hidden bg-slate-200 sm:h-[500px]">
          {n > 0 ? (
            slides.map((b, i) => {
              const img = (
                <img
                  key={b.id}
                  src={b.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
                  style={{ opacity: i === slide ? 1 : 0 }}
                />
              );
              return b.linkUrl && i === slide
                ? (b.linkUrl.startsWith('http')
                    ? <a key={b.id} href={b.linkUrl} className="absolute inset-0">{img}</a>
                    : <Link key={b.id} to={b.linkUrl} className="absolute inset-0">{img}</Link>)
                : img;
            })
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-900" />
          )}

          {/* top scrim so the navbar stays legible over bright photos */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent" />

          {n > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-700 shadow-md backdrop-blur hover:bg-white sm:left-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button onClick={() => go(1)} aria-label="Next"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-700 shadow-md backdrop-blur hover:bg-white sm:right-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </>
          )}
        </div>

        {/* search card — overlaps the bottom of the slider */}
        <div className="container-app relative">
          <div className="mx-auto -mt-16 max-w-3xl rounded-2xl bg-white p-2 shadow-2xl sm:-mt-20">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={`whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${
                    tab === tb.key ? 'border-b-2 border-brand-600 text-brand-700' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
              <Link to="/register" className="ml-auto flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600 hover:text-brand-700">
                Post Property <span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">FREE</span>
              </Link>
            </div>

            <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
              <select
                value={propType}
                onChange={(e) => setPropType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 focus:outline-none sm:w-44 sm:shrink-0 sm:border-0 sm:border-r sm:border-slate-200"
              >
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <SearchAutocomplete
                bare
                className="flex-1"
                basePath={active.base}
                extraParams={extra}
                placeholder='Search "3 BHK in Sarjapur" or "Prestige Bengaluru"'
              />
            </div>
          </div>
        </div>
      </div>

      {/* trending row + dots */}
      <div className="container-app pb-8 pt-5 text-center">
        {cities.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="font-medium text-slate-400">Trending:</span>
            {cities.slice(0, 6).map((c) => (
              <Link key={c.name} to={`/projects?city=${enc(c.name)}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 hover:bg-brand-50 hover:text-brand-700">
                {c.name}
              </Link>
            ))}
          </div>
        )}
        {n > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => { setSlide(i); if (timer.current) { clearInterval(timer.current); timer.current = null; } }}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-brand-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
