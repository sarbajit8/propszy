import { Link } from 'react-router-dom';
import { inr } from '../lib/format';
import FavoriteButton from './FavoriteButton';

/* tiny spec icons */
const I = {
  bed: 'M3 12V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 12h18M3 12v5m18-5v5M6 9h4M3 17h18',
  bath: 'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM7 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2M5 19l-1 2m15-2l1 2',
  area: 'M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4m12-6v4a2 2 0 0 1-2 2h-4',
  compass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16 8l-2 6-6 2 2-6 6-2z',
  pin: 'M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
};
const Spec = ({ d, children }) => (
  <span className="flex items-center gap-1.5 text-slate-600">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
    {children}
  </span>
);

const statusChip = {
  AVAILABLE: 'bg-emerald-500/95 text-white',
  SOLD: 'bg-rose-500/95 text-white',
  ON_HOLD: 'bg-slate-700/90 text-white',
};

function Badges({ p }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.isFeatured && <span className="badge bg-brand-600 text-white shadow-sm">Featured</span>}
      {p.isTrending && <span className="badge bg-amber-500 text-white shadow-sm">Trending</span>}
      {p.isBestSeller && <span className="badge bg-emerald-600 text-white shadow-sm">Best seller</span>}
    </div>
  );
}

function perSqft(price, area) {
  if (!price || !area) return null;
  return `${inr(Math.round(Number(price) / Number(area)))}/sqft`;
}

export default function PropertyCard({ property: p, variant = 'grid', className = '', hideFav = false, saved = false }) {
  const img = p.media?.[0]?.url || `https://picsum.photos/seed/${p.id}/720/540`;
  const to = `/properties/${p.id}`;
  const loc = [p.project?.name, p.project?.city].filter(Boolean).join(' · ');
  const psf = perSqft(p.price, p.carpetArea);

  const specs = (
    <>
      {p.bedrooms != null && <Spec d={I.bed}>{p.bedrooms} Bed</Spec>}
      {p.bathrooms != null && <Spec d={I.bath}>{p.bathrooms} Bath</Spec>}
      {p.carpetArea && <Spec d={I.area}>{p.carpetArea} {p.areaUnit || 'sqft'}</Spec>}
      {p.facing && <Spec d={I.compass}>{p.facing}</Spec>}
    </>
  );

  // Borderless, square-cornered card for home-page sliders.
  if (variant === 'plain') {
    return (
      <Link to={to} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img src={img} alt={p.unitType} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute left-3 top-3"><Badges p={p} /></div>
          {!hideFav && <div className="absolute right-3 top-3"><FavoriteButton propertyId={p.id} iconOnly initial={saved} /></div>}
          <span className={`badge absolute bottom-3 left-3 ${statusChip[p.status] || 'bg-slate-700/90 text-white'}`}>{p.status?.replace('_', ' ')}</span>
        </div>
        <div className="pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-bold text-brand-700">{inr(p.price)}</span>
            {psf && <span className="whitespace-nowrap text-xs font-medium text-slate-400">{psf}</span>}
          </div>
          <h3 className="mt-1 line-clamp-1 text-[15px] font-semibold text-slate-900 group-hover:text-brand-700">{p.unitType}</h3>
          <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-sm text-slate-500">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d={I.pin} /></svg>
            {loc}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs">{specs}</div>
        </div>
      </Link>
    );
  }

  if (variant === 'list') {
    return (
      <Link to={to} className={`card group flex gap-4 overflow-hidden p-3 transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}>
        <div className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-52">
          <img src={img} alt={p.unitType} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <span className={`badge absolute left-2 top-2 ${statusChip[p.status] || 'bg-slate-700/90 text-white'}`}>{p.status?.replace('_', ' ')}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold text-brand-700">{inr(p.price)}{psf && <span className="ml-1.5 text-xs font-medium text-slate-400">· {psf}</span>}</p>
              <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-brand-700">{p.unitType}</h3>
              <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-xs text-slate-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={I.pin} /></svg>
                {loc}
              </p>
            </div>
            <Badges p={p} />
          </div>
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs">{specs}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={to} className={`card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-xl ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={img} alt={p.unitType} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute left-3 top-3"><Badges p={p} /></div>
        {!hideFav && <div className="absolute right-3 top-3"><FavoriteButton propertyId={p.id} iconOnly initial={saved} /></div>}
        <span className={`badge absolute bottom-3 left-3 ${statusChip[p.status] || 'bg-slate-700/90 text-white'}`}>
          {p.status?.replace('_', ' ')}
        </span>
        <p className="absolute bottom-3 right-3 rounded-lg bg-white/95 px-2.5 py-1 text-sm font-bold text-brand-700 shadow-sm backdrop-blur">
          {inr(p.price)}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900 group-hover:text-brand-700">{p.unitType}</h3>
          {psf && <span className="whitespace-nowrap text-xs font-medium text-slate-400">{psf}</span>}
        </div>
        <p className="mt-1 line-clamp-1 flex items-center gap-1 text-sm text-slate-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d={I.pin} /></svg>
          {loc}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs">{specs}</div>
      </div>
    </Link>
  );
}
