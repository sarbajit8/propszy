import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { logout, selectUser } from '../features/auth/authSlice';
import { useFavorites, useCities } from '../lib/queries';
import SearchAutocomplete from './SearchAutocomplete';
import Logo from './Logo';
import { avatarPlaceholder } from '../lib/placeholder';

const nav = [
  { to: '/projects', label: 'Projects' },
  { to: '/properties', label: 'Properties' },
  { to: '/map', label: 'View Map' },
  { to: '/register?role=associate', label: 'For Associates' },
  { to: '/blog', label: 'Insights', badge: 'NEW' },
];

const dashboardPath = (role) =>
  role === 'ADMIN' || role === 'SUBADMIN' ? '/admin'
  : role === 'AGENT' ? '/associate'
  : '/account';

const CITY_KEY = 'propszy.city';

function CityPicker({ light }) {
  const navigate = useNavigate();
  const { data: cities = [] } = useCities();
  const [city, setCity] = useState(() => { try { return localStorage.getItem(CITY_KEY) || ''; } catch { return ''; } });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (name) => {
    setCity(name);
    try { name ? localStorage.setItem(CITY_KEY, name) : localStorage.removeItem(CITY_KEY); } catch { /* ignore */ }
    setOpen(false);
    navigate(name ? `/projects?city=${encodeURIComponent(name)}` : '/projects');
  };

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx('flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm', light ? 'text-white/90 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
      >
        <span className={light ? 'text-white/60' : 'text-slate-400'}>Buy in</span>
        <span className={clsx('max-w-[110px] truncate font-semibold', light ? 'text-white' : 'text-slate-800')}>{city || 'All India'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <button onClick={() => pick('')} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${!city ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'}`}>All India</button>
          {cities.map((c) => (
            <button key={c.id || c.name} onClick={() => pick(c.name)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${city === c.name ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'}`}>
              {c.name} {c.projectCount ? <span className="text-slate-300">{c.projectCount}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistButton({ user, onNavigate, light, className }) {
  const navigate = useNavigate();
  const { data: favs } = useFavorites(!!user);
  const count = favs?.length || 0;
  return (
    <button
      onClick={() => { onNavigate?.(); navigate(user ? '/wishlist' : '/login'); }}
      className={clsx(
        'relative grid h-10 w-10 place-items-center rounded-lg',
        light ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100 hover:text-rose-600',
        className
      )}
      title="Wishlist" aria-label={`Wishlist${count ? `, ${count} items` : ''}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={count ? '#e11d48' : 'none'} stroke={count ? '#e11d48' : 'currentColor'} strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

/* ── Compact avatar dropdown for all authenticated users ── */
function UserMenu({ user, light }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const isAgent = user.role === 'AGENT';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUBADMIN';

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-2 rounded-xl py-1 px-2 text-left transition-all duration-150',
          light
            ? 'text-white hover:bg-white/10 ring-1 ring-white/20'
            : 'text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200/80 bg-white/50'
        )}
        aria-label="User menu"
        aria-expanded={open}
      >
        <img
          src={user.avatarUrl || avatarPlaceholder(user.name)}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-brand-500/30"
        />
        <div className="hidden lg:flex flex-col text-left leading-tight">
          <span className={clsx('text-xs font-semibold max-w-[85px] truncate', light ? 'text-white' : 'text-slate-800')}>
            {user.name?.split(' ')[0] || 'User'}
          </span>
          <span className={clsx('text-[10px] font-medium tracking-tight', isAgent ? 'text-brand-600 font-bold' : light ? 'text-white/70' : 'text-slate-400')}>
            {isAgent ? 'Associate' : isAdmin ? 'Admin' : 'Account'}
          </span>
        </div>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={clsx('transition-transform duration-200', open ? 'rotate-180' : '', light ? 'text-white/70' : 'text-slate-400')}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-100">
          {/* User header */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img
                src={user.avatarUrl || avatarPlaceholder(user.name)}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-[11px] text-slate-400">{user.phone || user.email}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                isAgent
                  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                  : isAdmin
                  ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
              )}>
                {isAgent ? 'Associate Partner' : isAdmin ? 'Admin' : 'Customer'}
              </span>
              {isAgent && (
                <span className="text-[10px] text-slate-400 font-medium">Dual Access</span>
              )}
            </div>
          </div>

          {/* Navigation links based on role */}
          <div className="p-1.5 space-y-0.5">
            {isAgent && (
              <button
                onClick={() => go('/associate')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2.3"/><circle cx="5" cy="19" r="2.3"/><circle cx="19" cy="19" r="2.3"/><path d="M12 7.3V13M12 13L6.5 17M12 13l5.5 4" strokeLinecap="round"/></svg>
                Associate Dashboard
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => go('/admin')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                Admin Console
              </button>
            )}

            <button
              onClick={() => go('/account')}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {isAgent ? 'Customer Account' : 'My Account'}
            </button>

            <button
              onClick={() => go('/wishlist')}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
              Saved Properties
            </button>

            {!isAgent && !isAdmin && (
              <button
                onClick={() => go('/become-associate')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Become an Associate
              </button>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 p-1.5">
            <button
              onClick={async () => { setOpen(false); await dispatch(logout()); navigate('/'); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4-4-4M21 12H9M13 4H5a2 2 0 00-2 2v12a2 2 0 002 2h8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // lock page scroll while the mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const panelOpen = open || search;
  const overHero = location.pathname === '/';
  // sitting over the hero image, at the very top, with nothing open → light + near-invisible
  const light = overHero && !scrolled && !panelOpen;

  const navItems = [
    { to: '/projects', label: 'Projects' },
    { to: '/properties', label: 'Properties' },
    { to: '/map', label: 'View Map' },
    ...(user?.role === 'AGENT' ? [] : [{ to: '/become-associate', label: 'For Associates' }]),
    { to: '/blog', label: 'Insights', badge: 'NEW' },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300',
        panelOpen
          ? 'border-b border-slate-200 bg-white'
          : light
          ? 'border-b border-white/10 bg-white/5 backdrop-blur-sm'
          : 'border-b border-white/40 bg-white/80 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/45',
        !panelOpen && !light && scrolled && 'border-slate-200/60 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.25)] supports-[backdrop-filter]:bg-white/60'
      )}
    >
      <div className="container-app flex h-16 items-center gap-2 sm:gap-3">
        <Link to="/" className="flex shrink-0 items-center">
          <Logo tone={light ? 'light' : 'dark'} />
        </Link>

        <CityPicker light={light} />

        <nav className="mx-auto hidden items-center gap-0.5 xl:gap-1 lg:flex">
          {navItems.map((n) => (
            <NavLink key={n.label} to={n.to}
              className={({ isActive }) => clsx(
                'relative rounded-lg px-2.5 xl:px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                light
                  ? 'text-white/90 hover:text-white hover:bg-white/10'
                  : isActive ? 'text-brand-700 bg-brand-50/70 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              )}
            >
              {n.label}
              {n.badge && <span className="absolute -right-1 -top-1 rounded bg-rose-500 px-1 text-[8px] font-bold leading-tight text-white">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/account/properties/new"
            className={clsx(
              'hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors sm:inline-flex',
              light ? 'border-white/30 text-white hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50 bg-white/70 shadow-sm'
            )}
          >
            Post Property
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">FREE</span>
          </Link>

          <button
            onClick={() => setSearch((v) => !v)}
            className={clsx('grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl transition-colors', light ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>
          </button>
          <WishlistButton user={user} light={light} className="hidden sm:grid" />

          {user ? (
            <UserMenu user={user} light={light} />
          ) : (
            <Link
              to="/login"
              className={clsx(
                'hidden rounded-xl px-3.5 py-1.5 text-sm font-semibold md:inline-block transition-colors',
                light ? 'text-white hover:bg-white/10 ring-1 ring-white/20' : 'bg-brand-50 text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200/60'
              )}
            >
              Sign in
            </Link>
          )}

          <button
            className={clsx(
              'grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl ring-1 transition-colors lg:hidden',
              light ? 'text-white ring-white/20 hover:bg-white/10' : 'text-slate-700 ring-slate-200 hover:bg-slate-100'
            )}
            onClick={() => { setOpen((v) => !v); setSearch(false); }}
            aria-label="Menu" aria-expanded={open}
          >
            <span className="relative block h-3.5 w-[18px]">
              <span className={clsx('absolute left-0 top-0 h-[1.5px] w-[18px] rounded-full bg-current transition-all duration-300 ease-out', open && 'top-[6.5px] rotate-45')} />
              <span className={clsx('absolute left-0 top-[6.5px] h-[1.5px] w-[18px] rounded-full bg-current transition-all duration-200 ease-out', open && 'opacity-0')} />
              <span className={clsx('absolute left-0 top-[13px] h-[1.5px] w-[18px] rounded-full bg-current transition-all duration-300 ease-out', open && 'top-[6.5px] -rotate-45')} />
            </span>
          </button>
        </div>
      </div>

      {search && (
        <div className="border-t border-slate-200 bg-white">
          <div className="container-app py-3">
            <SearchAutocomplete autoFocus onNavigate={() => setSearch(false)} />
          </div>
        </div>
      )}

      {/* Mobile menu — slide-in sidebar */}
      {createPortal(
        <div
          className={clsx('fixed inset-0 z-[100] lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
          aria-hidden={!open}
        >
          <div
            className={clsx('fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
            onClick={() => setOpen(false)}
          />
          <aside
            className={clsx(
              'fixed inset-y-0 right-0 flex h-[100dvh] w-[85vw] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
              open ? 'translate-x-0' : 'translate-x-full'
            )}
          >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <Logo tone="dark" />
            <button onClick={() => setOpen(false)} aria-label="Close menu"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {user ? (
              user.role === 'AGENT' ? (
                <div className="mb-4 space-y-2">
                  <Link to="/associate" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-3 shadow-sm">
                    <img src={user.avatarUrl || avatarPlaceholder(user.name)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-brand-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span>
                      <span className="inline-flex items-center gap-1 rounded bg-brand-100/80 px-1.5 py-0.2 text-[10px] font-bold text-brand-700">Associate Partner</span>
                    </span>
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/associate" onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm">
                      Associate Hub
                    </Link>
                    <Link to="/account" onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                      My Account
                    </Link>
                  </div>
                </div>
              ) : (
                <Link to={dashboardPath(user.role)} onClick={() => setOpen(false)}
                  className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <img src={user.avatarUrl || avatarPlaceholder(user.name)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span>
                    <span className="block text-xs capitalize text-slate-400">{user.role?.toLowerCase()} · Open Dashboard</span>
                  </span>
                </Link>
              )
            ) : (
              <div className="mb-4 flex gap-2">
                <Link to="/login" className="btn-primary w-full text-center" onClick={() => setOpen(false)}>Sign in with OTP</Link>
              </div>
            )}

            <nav className="space-y-0.5">
              {navItems.map((n) => (
                <NavLink key={n.label} to={n.to} onClick={() => setOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                    isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {n.label}
                    {n.badge && <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">{n.badge}</span>}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </NavLink>
              ))}
              <Link to={user ? '/wishlist' : '/login'} onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50">
                Saved Properties
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              {user && user.role === 'CUSTOMER' && (
                <Link to="/become-associate" onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 px-3 py-2.5 text-[14px] font-semibold text-brand-700 mt-2">
                  <span>Become an Associate</span>
                  <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">EARN</span>
                </Link>
              )}
            </nav>

            <Link to="/account/properties/new" onClick={() => setOpen(false)}
              className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Post Property
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">FREE</span>
            </Link>
          </div>

          {user && (
            <div className="shrink-0 border-t border-slate-100 p-4">
              <button
                className="btn-ghost w-full justify-center"
                onClick={async () => { await dispatch(logout()); setOpen(false); navigate('/'); }}
              >
                Sign out
              </button>
            </div>
          )}
          </aside>
        </div>,
        document.body
      )}
    </header>
  );
}
