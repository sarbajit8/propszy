import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

const PANEL = {
  brand: {
    wrap: 'bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900',
    badge: 'bg-white/15 text-brand-50',
    heading: 'text-white',
    body: 'text-brand-100',
    foot: 'text-brand-200/80',
    blobA: 'bg-brand-400/30',
    blobB: 'bg-white/10',
  },
  staff: {
    wrap: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950',
    badge: 'bg-amber-400/15 text-amber-200',
    heading: 'text-white',
    body: 'text-slate-300',
    foot: 'text-slate-500',
    blobA: 'bg-amber-400/10',
    blobB: 'bg-brand-500/20',
  },
};

export function AuthShell({ title, subtitle, children, variant = 'brand', eyebrow, heading, blurb, features, heroImage, heroCard, wide = false }) {
  const p = PANEL[variant] || PANEL.brand;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className={`relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex ${p.wrap}`}>
        <div className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl ${p.blobA}`} />
        <div className={`pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full blur-3xl ${p.blobB}`} />

        <Link to="/" className="relative z-10 flex items-center gap-2">
          <Logo tone="light" imgClassName="h-9 rounded bg-white/95 p-1" />
        </Link>

        <div className="relative z-10">
          {eyebrow && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${p.badge}`}>
              {eyebrow}
            </span>
          )}
          <h2 className={`mt-4 text-3xl font-bold leading-tight ${p.heading}`}>{heading || 'Real estate, organised.'}</h2>
          <p className={`mt-3 max-w-sm ${p.body}`}>
            {blurb || 'Projects, units, verified agents and a transparent commission network — all in one place.'}
          </p>
          {features?.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {features.map(([icon, label]) => (
                <li key={label} className={`flex items-center gap-2.5 text-sm ${p.body}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">{icon}</span>
                  {label}
                </li>
              ))}
            </ul>
          )}

          {heroImage && (
            <div className="mt-7">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img src={heroImage} alt="" className="h-48 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              </div>
              {heroCard && (
                <div className="relative z-10 -mt-7 ml-4 flex max-w-xs items-center gap-3 rounded-xl bg-white p-3 shadow-xl">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">{heroCard.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{heroCard.title}</p>
                    <p className="truncate text-xs text-slate-500">{heroCard.subtitle}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className={`relative z-10 text-sm ${p.foot}`}>© {new Date().getFullYear()} Propszy</p>
      </div>
      <div className="flex items-center justify-center bg-slate-50/60 p-6">
        <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'}`}>
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Logo />
          </Link>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
