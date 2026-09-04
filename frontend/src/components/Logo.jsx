import { usePublicConfig } from '../lib/publicConfig';

/**
 * Site logo — a custom uploaded image (Admin → Settings → Branding) or the
 * default mark + wordmark. `tone` picks the default palette for light/dark grounds.
 */
export default function Logo({ className = '', tone = 'dark', imgClassName = 'h-8' }) {
  const { data: cfg } = usePublicConfig();
  const name = cfg?.companyName || 'Propszy';

  if (cfg?.logoUrl) {
    return <img src={cfg.logoUrl} alt={name} className={`${imgClassName} w-auto max-w-[170px] object-contain ${className}`} />;
  }

  const mark = tone === 'light' ? 'bg-white/15 text-white' : 'bg-brand-600 text-white';
  const text = tone === 'light' ? 'text-white' : 'text-slate-900';

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-lg font-bold ${mark}`}>
        {name.trim()[0]?.toUpperCase() || 'P'}
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${text}`}>{name}</span>
    </span>
  );
}
