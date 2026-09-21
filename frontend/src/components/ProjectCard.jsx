import { Link } from 'react-router-dom';
import { priceRange, STATUS_LABEL, TYPE_LABEL } from '../lib/format';
import { StatusBadge } from './ui';
import FavoriteButton from './FavoriteButton';

function possessionLabel(p) {
  if (p.possessionDate) {
    const d = new Date(p.possessionDate);
    return `Possession from ${d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })}`;
  }
  return {
    READY_TO_MOVE: 'Ready to move',
    ONGOING: 'Under construction',
    UPCOMING: 'New launch',
  }[p.status] || '';
}

function Badges({ project }) {
  return (
    <div className="flex flex-wrap gap-1 sm:gap-1.5">
      <StatusBadge status={project.status} label={STATUS_LABEL[project.status]} className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1" />
      {project.isFeatured && <span className="badge text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-brand-600 text-white">Featured</span>}
      {project.isTrending && <span className="badge text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-amber-500 text-white">Trending</span>}
      {project.isBestSeller && <span className="badge text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-emerald-600 text-white">Best seller</span>}
    </div>
  );
}

export default function ProjectCard({ project, variant = 'grid', rank, tag }) {
  const img =
    project.coverImageUrl ||
    project.media?.[0]?.url ||
    `https://picsum.photos/seed/${project.id}/640/400`;
  const units = project.counts?.properties ?? project._count?.properties;
  const to = `/projects/${project.slug || project.id}`;
  const location = [project.address, project.city, project.state].filter(Boolean).join(', ') || '—';

  // Full-bleed image card with everything overlaid — home-page "in demand" rail.
  if (variant === 'demand') {
    const TYPE_WORD = { RESIDENTIAL: 'Apartment', COMMERCIAL: 'Commercial', PLOT: 'Plot', MIXED: 'Property' };
    const developerName = project.developer?.name || project.builder;
    const configLine = [project.bhk, TYPE_WORD[project.type] || 'Property'].filter(Boolean).join(' ');
    const place = [project.address, project.city].filter(Boolean).join(', ');
    return (
      <Link
        to={to}
        className="group relative block overflow-hidden rounded-2xl bg-slate-900 shadow-sm transition duration-300 hover:shadow-2xl"
      >
        <div className="relative aspect-[16/11]">
          <img src={img} alt={project.name} loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5" />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h3 className="line-clamp-1 text-lg font-bold tracking-tight sm:text-xl">{project.name}</h3>
          {developerName && <p className="mt-0.5 text-sm text-white/65">by {developerName}</p>}

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/95">{configLine}</p>
              {place && <p className="line-clamp-1 text-sm text-white/60">{place}</p>}
            </div>
            <p className="shrink-0 text-base font-extrabold tracking-tight sm:text-lg">
              {priceRange(project.priceMin, project.priceMax)}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  // 99acres-style card: RERA + heart + possession overlay, config subtitle, price.
  if (variant === 'recommended') {
    const subtitle = project.configLabel
      || `${project.bhk ? project.bhk + ' ' : ''}${TYPE_LABEL[project.type] || ''}${location !== '—' ? ` in ${location}` : ''}`.trim()
      || location;
    const poss = possessionLabel(project);
    return (
      <Link to={to} className="group block">
        <div className="relative aspect-[16/11] overflow-hidden rounded-xl bg-slate-200">
          <img src={img} alt={project.name} loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

          {tag && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 shadow-sm">
              {tag}
            </span>
          )}
          <div className="absolute right-3 top-3">
            <FavoriteButton projectId={project.id} iconOnly
              className="grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:text-white" />
          </div>
          {poss && (
            <p className="absolute bottom-2.5 left-3 text-xs font-bold text-white drop-shadow">{poss}</p>
          )}
        </div>

        <div className="pt-2.5">
          <h3 className="line-clamp-1 text-[15px] font-bold text-slate-900 group-hover:text-brand-700">{project.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{subtitle}</p>
          <p className="mt-1.5 text-[15px] font-bold text-slate-900">{priceRange(project.priceMin, project.priceMax)}</p>
        </div>
      </Link>
    );
  }

  // Borderless, square-cornered card for home-page sliders.
  if (variant === 'plain') {
    return (
      <Link to={to} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img src={img} alt={project.name} loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3"><Badges project={project} /></div>
        </div>
        <div className="pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{TYPE_LABEL[project.type] || project.type}</p>
          <h3 className="mt-1 line-clamp-1 text-[15px] font-semibold text-slate-900 group-hover:text-brand-700">{project.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{[project.address, project.city].filter(Boolean).join(', ') || '—'}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">{priceRange(project.priceMin, project.priceMax)}</span>
            {units != null && <span className="text-xs text-slate-400">{units} units</span>}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'list') {
    return (
      <Link to={to} className="card group flex gap-4 overflow-hidden p-3 transition hover:shadow-lg">
        <div className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-52">
          <img src={img} alt={project.name} loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{TYPE_LABEL[project.type] || project.type}</p>
              <h3 className="mt-0.5 line-clamp-1 text-base font-semibold text-slate-900 group-hover:text-brand-700">{project.name}</h3>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{location}</p>
            </div>
            <Badges project={project} />
          </div>
          {project.builder && <p className="mt-1 text-xs text-slate-400">by {project.builder}</p>}
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-sm font-semibold text-slate-900">{priceRange(project.priceMin, project.priceMax)}</span>
            <span className="text-xs text-slate-400">
              {units != null ? `${units} units` : ''}{project.amenities?.length ? ` · ${project.amenities.length} amenities` : ''}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={to} className="card group flex flex-col overflow-hidden transition hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img src={img} alt={project.name} loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3"><Badges project={project} /></div>
      </div>
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-brand-600">{TYPE_LABEL[project.type] || project.type}</p>
        <h3 className="mt-0.5 sm:mt-1 line-clamp-1 text-xs sm:text-base font-semibold text-slate-900 group-hover:text-brand-700">{project.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] sm:text-sm text-slate-500">{[project.address, project.city].filter(Boolean).join(', ') || '—'}</p>
        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-100 pt-1.5 sm:pt-2">
          <span className="text-xs sm:text-sm font-semibold text-slate-900">{priceRange(project.priceMin, project.priceMax)}</span>
          {units != null && <span className="text-[10px] sm:text-xs text-slate-400">{units} units</span>}
        </div>
      </div>
    </Link>
  );
}
