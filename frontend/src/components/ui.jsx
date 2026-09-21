import clsx from 'clsx';

export function Spinner({ className }) {
  return (
    <svg className={clsx('animate-spin', className || 'h-5 w-5 text-brand-600')} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8 text-brand-600" />
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}

const statusStyles = {
  UPCOMING: 'bg-amber-100 text-amber-700',
  ONGOING: 'bg-brand-100 text-brand-700',
  READY_TO_MOVE: 'bg-emerald-100 text-emerald-700',
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  SOLD: 'bg-rose-100 text-rose-700',
  ON_HOLD: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status, label, className = '' }) {
  return <span className={clsx('badge shrink-0 whitespace-nowrap', statusStyles[status] || 'bg-slate-100 text-slate-600', className)}>{label || status}</span>;
}

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-3 h-4 w-24" />
      </div>
    </div>
  );
}

// Right-side slide-over panel.
export function Drawer({ open, onClose, title, children, footer, width = 'max-w-md' }) {
  return (
    <div
      className={clsx('fixed inset-0 z-50 transition', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        className={clsx('absolute inset-0 bg-slate-900/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={clsx(
          'absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-xl transition-transform duration-300',
          width,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-ghost -mr-2" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
