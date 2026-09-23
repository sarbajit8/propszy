import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api, unwrap } from '../lib/api';
import { logout, selectUser } from '../features/auth/authSlice';
import { avatarPlaceholder } from '../lib/placeholder';
import Logo from './Logo';
import SearchAutocomplete from './SearchAutocomplete';
import MobileBottomNav from './MobileBottomNav';

const Icon = {
  grid: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  heart: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" /></svg>,
  building: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M4 21h16M9 21v-4h2v4M9 8h1M14 8h1M9 12h1M14 12h1M15 21V11h4a1 1 0 0 1 1 1v9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  chat: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.7 8.7 0 0 1-3.4-.7L3 21l1.8-5.4A8.4 8.4 0 0 1 12.6 3a8.4 8.4 0 0 1 8.4 8.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  clock: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  user: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" strokeLinecap="round" /></svg>,
  plus: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" {...p}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>,
  menu: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>,
  close: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>,
  logout: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  home: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const NAV = [
  ['/account', 'Overview', Icon.grid],
  ['/account/favorites', 'Favorites', Icon.heart, 'favorites'],
  ['/account/properties', 'My Properties', Icon.building, 'properties'],
  ['/account/enquiries', 'My Enquiries', Icon.chat, 'enquiries'],
  ['/account/activity', 'Activity', Icon.clock],
  ['/account/profile', 'Profile', Icon.user],
];

function useNavCounts() {
  const { data: favs } = useQuery({ queryKey: ['me-fav'], queryFn: () => unwrap(api.get('/favorites')) });
  const { data: enq } = useQuery({ queryKey: ['me-enq-count'], queryFn: () => api.get('/me/enquiries', { params: { limit: 1 } }).then((r) => r.data?.meta?.total) });
  const { data: props } = useQuery({ queryKey: ['me-props-count'], queryFn: () => api.get('/properties', { params: { mine: true, limit: 1 } }).then((r) => r.data?.meta?.total) });
  return { favorites: favs?.length, enquiries: enq, properties: props };
}

function SidebarContent({ user, onNavigate }) {
  const joined = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const counts = useNavCounts();
  const isAgent = user?.role === 'AGENT';
  const isPendingUpgrade = user?.role === 'CUSTOMER' && user?.kycStatus === 'PENDING';
  const isRejectedUpgrade = user?.role === 'CUSTOMER' && user?.kycStatus === 'REJECTED';
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-lg shadow-brand-900/10 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <img src={user?.avatarUrl || avatarPlaceholder(user?.name)} alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/40" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <span className="mt-0.5 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              {isAgent ? 'Associate & Customer' : 'Customer'}{joined ? ` · since ${joined}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Agent dashboard switcher */}
      {isAgent && (
        <Link
          to="/associate"
          onClick={onNavigate}
          className="mt-3 flex items-center gap-2.5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2.3" /><circle cx="5" cy="19" r="2.3" /><circle cx="19" cy="19" r="2.3" /><path d="M12 7.3V13M12 13L6.5 17M12 13l5.5 4" strokeLinecap="round" /></svg>
          Open Associate Dashboard
          <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      )}

      {/* Customer → Agent upgrade status */}
      {isPendingUpgrade && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs">
          <p className="font-semibold text-amber-800">⏳ Associate Upgrade: Under Review</p>
          <p className="mt-0.5 text-amber-700">Your KYC application is being reviewed by Admin.</p>
        </div>
      )}
      {isRejectedUpgrade && (
        <Link
          to="/become-associate"
          onClick={onNavigate}
          className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
        >
          ✗ Associate Upgrade Rejected — Resubmit
        </Link>
      )}
      {!isAgent && !isPendingUpgrade && !isRejectedUpgrade && (
        <Link
          to="/become-associate"
          onClick={onNavigate}
          className="mt-3 flex items-center gap-2.5 rounded-2xl border border-dashed border-brand-300/70 bg-white/50 px-4 py-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Become an Associate
        </Link>
      )}

      <nav className="mt-4 space-y-1 rounded-2xl border border-white/60 bg-white/60 p-2 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
        {NAV.map(([to, label, IconFn, countKey]) => {
          const count = countKey ? counts[countKey] : null;
          return (
            <NavLink key={to} to={to} end={to === '/account'} onClick={onNavigate}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20' : 'text-slate-600 hover:bg-white/80'
              )}>
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-white' : 'text-slate-400'}><IconFn /></span>
                  <span className="flex-1">{label}</span>
                  {!!count && (
                    <span className={clsx(
                      'grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
                    )}>
                      {count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <Link to="/account/properties/new" onClick={onNavigate}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-300/70 bg-white/50 px-3 py-3 text-sm font-semibold text-brand-700 backdrop-blur-xl hover:bg-white/80">
        <Icon.plus /> List a Property
      </Link>
    </>
  );
}

export default function AccountLayout() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50">
      <div className="pointer-events-none fixed -left-24 -top-24 h-72 w-72 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 top-1/3 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-100/40 blur-3xl" />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/60 bg-white/60 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white/80 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon.menu />
          </button>
          <Link to="/" className="shrink-0"><Logo /></Link>
        </div>
        <div className="hidden flex-1 justify-center px-6 md:flex">
          <div className="w-full max-w-md rounded-full border border-white/70 bg-white/70 px-3.5 py-2 shadow-sm backdrop-blur-xl">
            <SearchAutocomplete placeholder="Search projects, properties, cities…" bare hideButton className="w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'AGENT' && (
            <Link to="/associate" className="hidden items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 sm:flex">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2.3" /><circle cx="5" cy="19" r="2.3" /><circle cx="19" cy="19" r="2.3" /><path d="M12 7.3V13M12 13L6.5 17M12 13l5.5 4" strokeLinecap="round" /></svg>
              Associate Dashboard
            </Link>
          )}
          <Link to="/" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white/80 sm:flex">
            <Icon.home /> Back to site
          </Link>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            onClick={async () => { await dispatch(logout()); navigate('/'); }}
          >
            <Icon.logout /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <SidebarContent user={user} />
          </div>
        </aside>

        {/* mobile sidebar drawer */}
        <div className={clsx('fixed inset-0 z-40 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
          <div onClick={() => setOpen(false)}
            className={clsx('absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity', open ? 'opacity-100' : 'opacity-0')} />
          <div className={clsx(
            'absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-white/60 bg-white/80 p-4 shadow-xl backdrop-blur-xl transition-transform duration-300',
            open ? 'translate-x-0' : '-translate-x-full'
          )}>
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" onClick={() => setOpen(false)}>
                <Icon.close />
              </button>
            </div>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>

        <main key={location.pathname} className="min-w-0 flex-1 animate-fade-up pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
