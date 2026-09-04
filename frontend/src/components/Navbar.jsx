import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { logout, selectUser } from '../features/auth/authSlice';
import { useFavorites, useCities } from '../lib/queries';
import SearchAutocomplete from './SearchAutocomplete';
import Logo from './Logo';

const nav = [
  { to: '/projects', label: 'Projects' },
  { to: '/properties', label: 'Properties' },
  { to: '/map', label: 'View Map' },
  { to: '/register?role=agent', label: 'For Agents' },
  { to: '/blog', label: 'Insights', badge: 'NEW' },
];

const dashboardPath = (role) =>
  role === 'ADMIN' || role === 'SUBADMIN' ? '/admin'
  : role === 'AGENT' ? '/agent'
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

  const panelOpen = open || search;
  const overHero = location.pathname === '/';
  // sitting over the hero image, at the very top, with nothing open → light + near-invisible
  const light = overHero && !scrolled && !panelOpen;

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
      <div className="container-app flex h-16 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center">
          <Logo tone={light ? 'light' : 'dark'} />
        </Link>

        <CityPicker light={light} />

        <nav className="mx-auto hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <NavLink key={n.label} to={n.to}
              className={({ isActive }) => clsx(
                'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                light
                  ? 'text-white/90 hover:text-white'
                  : isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {n.label}
              {n.badge && <span className="absolute -right-1 -top-1 rounded bg-rose-500 px-1 text-[8px] font-bold leading-tight text-white">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/register"
            className={clsx(
              'hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold sm:inline-flex',
              light ? 'border-white/40 text-white hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            )}
          >
            Post Property
            <span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">FREE</span>
          </Link>

          <button
            onClick={() => setSearch((v) => !v)}
            className={clsx('grid h-10 w-10 place-items-center rounded-lg', light ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
            aria-label="Search"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>
          </button>
          <WishlistButton user={user} light={light} className="hidden sm:grid" />

          {user ? (
            <Link to={dashboardPath(user.role)} className={clsx('hidden rounded-lg px-3 py-2 text-sm font-semibold md:inline-block', light ? 'text-white hover:bg-white/10' : 'text-brand-700 hover:bg-brand-50')}>Dashboard</Link>
          ) : (
            <Link to="/login" className={clsx('hidden rounded-lg px-3 py-2 text-sm font-semibold md:inline-block', light ? 'text-white hover:bg-white/10' : 'text-brand-700 hover:bg-brand-50')}>Sign in</Link>
          )}

          <button
            className={clsx('grid h-10 w-10 place-items-center rounded-lg lg:hidden', light ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
            onClick={() => setOpen((v) => !v)} aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
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

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          {nav.map((n) => (
            <Link key={n.label} to={n.to} onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {n.label}
            </Link>
          ))}
          <Link to={user ? '/wishlist' : '/login'} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Wishlist</Link>
          <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
            {user ? (
              <>
                <Link to={dashboardPath(user.role)} className="btn-outline flex-1" onClick={() => setOpen(false)}>Dashboard</Link>
                <button className="btn-ghost" onClick={async () => { await dispatch(logout()); setOpen(false); navigate('/'); }}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline flex-1" onClick={() => setOpen(false)}>Sign in</Link>
                <Link to="/register" className="btn-primary flex-1" onClick={() => setOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
