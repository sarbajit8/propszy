import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchAutocomplete from './SearchAutocomplete';

// Search bar on top; below it a swipeable image slider.
// Mobile: current slide ~full width, next slide peeks, drag to slide, no arrows.
// Desktop: one full-width slide with arrows.
export default function HeroSlider({ banners = [], cities = [] }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const timer = useRef(null);
  const paused = useRef(false);

  const slides = banners.filter((b) => b.imageUrl);
  const has = slides.length > 0;

  // Scroll the TRACK horizontally only — never the page.
  const goTo = (n) => {
    const track = trackRef.current;
    if (!track || !slides.length) return;
    const idx = ((n % slides.length) + slides.length) % slides.length;
    const slide = slideRefs.current[idx];
    if (slide) {
      const delta = slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollTo({ left: track.scrollLeft + delta, behavior: 'smooth' });
    }
    setActive(idx);
  };

  // autoplay
  useEffect(() => {
    if (slides.length < 2) return undefined;
    timer.current = setInterval(() => {
      if (!paused.current) goTo(active + 1);
    }, 6000);
    return () => clearInterval(timer.current);
  }, [slides.length, active]); // eslint-disable-line

  // keep the active dot in sync while the user swipes
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const trackLeft = track.getBoundingClientRect().left;
    let best = 0;
    let bestDist = Infinity;
    slideRefs.current.forEach((s, idx) => {
      if (!s) return;
      const d = Math.abs(s.getBoundingClientRect().left - trackLeft);
      if (d < bestDist) { bestDist = d; best = idx; }
    });
    setActive(best);
  };

  const slideImg = (b) => <img src={b.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />;

  return (
    <section className="container-app pt-8 pb-10">
      {/* search — above the banner */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Find your next home in a project you can trust
        </h1>
        <SearchAutocomplete className="mt-5" />
        {cities.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
            {cities.slice(0, 6).map((c) => (
              <Link key={c.name} to={`/projects?city=${encodeURIComponent(c.name)}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 hover:bg-brand-50 hover:text-brand-700">
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* slider */}
      {!has ? (
        <div className="mt-8 aspect-[21/9] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 sm:aspect-[3/1]" />
      ) : (
        <div className="mt-8">
          <div className="relative">
            <div
              ref={trackRef}
              onScroll={onScroll}
              onPointerDown={() => { paused.current = true; }}
              onPointerUp={() => { paused.current = false; }}
              onMouseEnter={() => { paused.current = true; }}
              onMouseLeave={() => { paused.current = false; }}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((b, idx) => (
                <div
                  key={b.id}
                  ref={(el) => { slideRefs.current[idx] = el; }}
                  className="relative aspect-[16/10] w-[86%] shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[3/1] sm:w-full"
                >
                  {b.linkUrl
                    ? (b.linkUrl.startsWith('http')
                        ? <a href={b.linkUrl} className="block h-full w-full">{slideImg(b)}</a>
                        : <Link to={b.linkUrl} className="block h-full w-full">{slideImg(b)}</Link>)
                    : slideImg(b)}
                </div>
              ))}
            </div>

            {slides.length > 1 && (
              <>
                <button onClick={() => goTo(active - 1)} aria-label="Previous"
                  className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 text-slate-700 shadow-md backdrop-blur hover:bg-white sm:block">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button onClick={() => goTo(active + 1)} aria-label="Next"
                  className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 text-slate-700 shadow-md backdrop-blur hover:bg-white sm:block">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </>
            )}
          </div>

          {slides.length > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              {slides.map((_, idx) => (
                <button key={idx} onClick={() => goTo(idx)} aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${idx === active ? 'w-6 bg-brand-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
