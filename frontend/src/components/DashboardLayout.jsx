import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { logout, selectUser } from '../features/auth/authSlice';
import { avatarPlaceholder } from '../lib/placeholder';
import Logo from './Logo';

const Icon = {
  grid: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  layers: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" /><path d="M3 13l9 5 9-5M3 8l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" opacity=".6" /></svg>,
  building: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M4 21h16M9 21v-4h2v4M9 8h1M14 8h1M9 12h1M14 12h1M15 21V11h4a1 1 0 0 1 1 1v9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  tag: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M20.6 12.4L12 21l-9-9 8.6-8.6H20.6v8.6z" strokeLinejoin="round" /><circle cx="15" cy="7" r="1.3" fill="currentColor" stroke="none" /></svg>,
  pin: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg>,
  briefcase: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" strokeLinecap="round" /></svg>,
  sliders: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" strokeLinecap="round" /><circle cx="16" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="15" cy="18" r="2" /></svg>,
  chat: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.7 8.7 0 0 1-3.4-.7L3 21l1.8-5.4A8.4 8.4 0 0 1 12.6 3a8.4 8.4 0 0 1 8.4 8.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  users: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-3-1.9-5.2-4.5-5.8" strokeLinecap="round" /></svg>,
  shieldCheck: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  network: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="5" r="2.3" /><circle cx="5" cy="19" r="2.3" /><circle cx="19" cy="19" r="2.3" /><path d="M12 7.3V13M12 13L6.5 17M12 13l5.5 4" strokeLinecap="round" /></svg>,
  wallet: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14.5h2" strokeLinecap="round" /><path d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" /></svg>,
  layout: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></svg>,
  fileText: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M7 3h7l4 4v14H7z" strokeLinejoin="round" /><path d="M11 9h4M11 13h4M11 17h4" strokeLinecap="round" /></svg>,
  monitor: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" strokeLinecap="round" /></svg>,
  heart: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" /></svg>,
  barChart: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  settings: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  target: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
  home: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  menu: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>,
  close: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>,
  logout: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  chevron: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" {...p}><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const ADMIN_GROUPS = [
  { label: 'Overview', items: [['/admin', 'Overview', Icon.grid]] },
  {
    label: 'Catalog',
    items: [
      ['/admin/projects', 'Projects', Icon.layers],
      ['/admin/properties', 'Properties', Icon.building],
      ['/admin/categories', 'Unit categories', Icon.tag],
      ['/admin/cities', 'Cities', Icon.pin],
      ['/admin/developers', 'Developers', Icon.briefcase],
      ['/admin/configurations', 'Configurations', Icon.sliders],
    ],
  },
  {
    label: 'Sales & CRM',
    items: [
      ['/admin/leads', 'Leads', Icon.chat],
      ['/admin/associates', 'Associates', Icon.users],
      ['/admin/customers', 'Customers', Icon.users],
      ['/admin/kyc', 'KYC review', Icon.shieldCheck],
      ['/admin/rates', 'Commission rates', Icon.target],
      ['/admin/mlm', 'MLM & commissions', Icon.network],
      ['/admin/commissions', 'Commission ledger', Icon.wallet],
    ],
  },
  {
    label: 'Content',
    items: [
      ['/admin/home', 'Home page', Icon.monitor],
      ['/admin/cms', 'CMS', Icon.layout],
      ['/admin/blog', 'Blog', Icon.fileText],
    ],
  },
  {
    label: 'Platform',
    items: [
      ['/admin/wishlists', 'Wishlists', Icon.heart],
      ['/admin/reports', 'Reports', Icon.barChart],
      ['/admin/settings', 'Settings', Icon.settings],
    ],
  },
];

const AGENT_GROUPS = [
  {
    label: 'Workspace',
    items: [
      ['/associate', 'Overview', Icon.grid],
      ['/associate/tree', 'My network', Icon.network],
      ['/associate/leads', 'My leads', Icon.chat],
      ['/associate/commissions', 'Earnings', Icon.wallet],
      ['/associate/rates', 'Commission rates', Icon.target],
      ['/associate/recruit', 'Recruit', Icon.users],
      ['/associate/kyc', 'KYC & payout', Icon.shieldCheck],
    ],
  },
];

const GROUPS = { admin: ADMIN_GROUPS, associate: AGENT_GROUPS };

function isItemActive(pathname, to) {
  return to.split('/').length === 2 ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarNav({ groups, pathname, onNavigate }) {
  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</p>
          <div className="mt-1.5 space-y-0.5">
            {g.items.map(([to, label, IconFn]) => {
              const active = isItemActive(pathname, to);
              return (
                <NavLink key={to} to={to} end={to.split('/').length === 2} onClick={onNavigate}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-brand-600 text-white shadow-sm shadow-brand-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}>
                  <span className={active ? 'text-white' : 'text-slate-500'}><IconFn /></span>
                  {label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarShell({ area, groups, pathname, user, onNavigate, dispatch, navigate }) {
  const isAgent = area === 'associate';
  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo tone="light" imgClassName="h-7 rounded bg-white/95 p-1" />
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-300">{area}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav groups={groups} pathname={pathname} onNavigate={onNavigate} />
      </div>
      {isAgent && (
        <div className="shrink-0 border-t border-white/10 px-3 py-2">
          <Link
            to="/account"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            Switch to User Dashboard
          </Link>
        </div>
      )}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <img src={user?.avatarUrl || avatarPlaceholder(user?.name)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-[11px] capitalize text-slate-400">{user?.role?.toLowerCase()}</p>
          </div>
          <button onClick={async () => { await dispatch(logout()); navigate('/'); }} title="Sign out"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-400">
            <Icon.logout />
          </button>
        </div>
      </div>
    </div>
  );
}

function pageTitleFor(pathname, groups) {
  for (const g of groups) {
    for (const [to, label] of g.items) {
      if (isItemActive(pathname, to)) return label;
    }
  }
  return 'Dashboard';
}

export default function DashboardLayout({ area }) {
  const groups = GROUPS[area] || [];
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const title = pageTitleFor(location.pathname, groups);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {/* desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <SidebarShell area={area} groups={groups} pathname={location.pathname} user={user} dispatch={dispatch} navigate={navigate} />
          </div>
        </aside>

        {/* mobile sidebar drawer */}
        <div className={clsx('fixed inset-0 z-40 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
          <div onClick={() => setOpen(false)}
            className={clsx('absolute inset-0 bg-slate-900/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')} />
          <div className={clsx(
            'absolute left-0 top-0 h-full w-72 shadow-xl transition-transform duration-300',
            open ? 'translate-x-0' : '-translate-x-full'
          )}>
            <div className="flex justify-end p-2">
              <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10" onClick={() => setOpen(false)}>
                <Icon.close />
              </button>
            </div>
            <div className="-mt-12">
              <SidebarShell area={area} groups={groups} pathname={location.pathname} user={user} onNavigate={() => setOpen(false)} dispatch={dispatch} navigate={navigate} />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
                <Icon.menu />
              </button>
              <p className="flex min-w-0 items-center gap-1 truncate text-sm text-slate-400">
                <span className="capitalize">{area}</span> <Icon.chevron /> <span className="truncate font-medium text-slate-600">{title}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {area === 'associate' && (
                <Link to="/account" className="hidden items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 sm:flex">
                  <Icon.grid /> User Dashboard
                </Link>
              )}
              <Link to="/" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 sm:flex">
                <Icon.home /> Back to site
              </Link>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
