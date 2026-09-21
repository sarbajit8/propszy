import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice';
import { useFavorites } from '../lib/queries';
import { avatarPlaceholder } from '../lib/placeholder';

export default function MobileBottomNav() {
  const location = useLocation();
  const user = useSelector(selectUser);
  const { data: favs } = useFavorites(!!user);
  const wishlistCount = favs?.length || 0;

  const profilePath = useMemo(() => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'AGENT') return '/associate';
    return '/account/profile';
  }, [user]);

  const navItems = useMemo(() => [
    {
      id: 'home',
      label: 'Home',
      to: '/',
      isActive: location.pathname === '/',
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-150 ${active ? 'scale-110 text-brand-600' : 'text-slate-500'}`}
          viewBox="0 0 24 24"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.2 : 0}
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20v-9.5z" />
          <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
        </svg>
      ),
    },
    {
      id: 'projects',
      label: 'Projects',
      to: '/projects',
      isActive: location.pathname.startsWith('/projects'),
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-150 ${active ? 'scale-110 text-brand-600' : 'text-slate-500'}`}
          viewBox="0 0 24 24"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.2 : 0}
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4v18" />
          <path d="M12 9l7 3v9" />
          <path d="M8.5 9.5h.01M8.5 13.5h.01M8.5 17.5h.01M15.5 14h.01M15.5 17.5h.01" />
        </svg>
      ),
    },
    {
      id: 'properties',
      label: 'Properties',
      to: '/properties',
      isActive: location.pathname.startsWith('/properties'),
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-150 ${active ? 'scale-110 text-brand-600' : 'text-slate-500'}`}
          viewBox="0 0 24 24"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.2 : 0}
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 21V9.5L12 4l8 5.5V21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
          <circle cx="12" cy="13" r="2.5" />
          <path d="M12 15.5V19" />
        </svg>
      ),
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      to: user ? '/wishlist' : '/login',
      isActive: location.pathname === '/wishlist',
      badge: wishlistCount > 0 ? (wishlistCount > 99 ? '99+' : wishlistCount) : null,
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-150 ${
            active
              ? 'scale-110 text-rose-500'
              : wishlistCount > 0
              ? 'text-rose-500'
              : 'text-slate-500'
          }`}
          viewBox="0 0 24 24"
          fill={active || wishlistCount > 0 ? '#f43f5e' : 'none'}
          fillOpacity={active ? 0.95 : wishlistCount > 0 ? 0.25 : 0}
          stroke={active || wishlistCount > 0 ? '#e11d48' : 'currentColor'}
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: user ? (user.name?.split(' ')[0] || 'Profile') : 'Profile',
      to: profilePath,
      isActive:
        location.pathname.startsWith('/account') ||
        location.pathname.startsWith('/associate') ||
        location.pathname.startsWith('/admin') ||
        location.pathname === '/login' ||
        location.pathname === '/register',
      icon: (active) =>
        user ? (
          <div className="relative flex items-center justify-center">
            <img
              src={user.avatarUrl || avatarPlaceholder(user.name)}
              alt=""
              className={`h-6 w-6 rounded-full object-cover transition-all duration-150 ${
                active
                  ? 'ring-2 ring-brand-600 ring-offset-1 ring-offset-white scale-110'
                  : 'ring-1 ring-slate-300'
              }`}
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                active ? 'bg-brand-600' : 'bg-emerald-500'
              }`}
            />
          </div>
        ) : (
          <svg
            className={`h-5 w-5 transition-transform duration-150 ${active ? 'scale-110 text-brand-600' : 'text-slate-500'}`}
            viewBox="0 0 24 24"
            fill={active ? 'currentColor' : 'none'}
            fillOpacity={active ? 0.2 : 0}
            stroke="currentColor"
            strokeWidth={active ? 2.2 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.8 3.6-7 8-7s8 3.2 8 7" />
          </svg>
        ),
    },
  ], [location.pathname, user, wishlistCount, profilePath]);

  return (
    <nav
      id="mobile-sticky-footer"
      aria-label="Mobile Bottom Navigation"
      className="fixed inset-x-0 bottom-0 z-50 block lg:hidden select-none bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Top brand accent border */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

      {/* Main navigation row with fixed 60px height */}
      <div className="mx-auto flex h-[60px] max-w-md items-center justify-around px-2">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="group relative flex h-full flex-1 flex-col items-center justify-center pt-1.5 pb-1 transition-transform duration-150 active:scale-95"
          >
            {/* Active top pill indicator right on the top edge */}
            {item.isActive && (
              <span className="absolute top-0 h-[3px] w-8 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 shadow-sm shadow-brand-500/50" />
            )}

            {/* Icon container */}
            <div
              className={`relative flex h-7 items-center justify-center rounded-lg px-2.5 transition-colors duration-150 ${
                item.isActive
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-slate-500 group-hover:text-slate-700'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon(item.isActive)}

                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Text label - always visible, never cut off */}
            <span
              className={`mt-1 truncate max-w-[68px] text-[11px] font-medium leading-none tracking-tight transition-colors duration-150 ${
                item.isActive
                  ? 'font-bold text-brand-700'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
