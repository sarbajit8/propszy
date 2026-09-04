import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { logout, selectUser } from '../features/auth/authSlice';
import Logo from './Logo';

const MENUS = {
  admin: [
    ['/admin', 'Overview'],
    ['/admin/projects', 'Projects'],
    ['/admin/properties', 'Properties'],
    ['/admin/leads', 'Leads'],
    ['/admin/agents', 'Agents'],
    ['/admin/kyc', 'KYC review'],
    ['/admin/mlm', 'MLM & commissions'],
    ['/admin/commissions', 'Commission ledger'],
    ['/admin/cms', 'CMS'],
    ['/admin/blog', 'Blog'],
    ['/admin/home', 'Home page'],
    ['/admin/cities', 'Cities'],
    ['/admin/developers', 'Developers'],
    ['/admin/categories', 'Unit categories'],
    ['/admin/configurations', 'Configurations'],
    ['/admin/reports', 'Reports'],
    ['/admin/settings', 'Settings'],
  ],
  agent: [
    ['/agent', 'Overview'],
    ['/agent/tree', 'My network'],
    ['/agent/leads', 'My leads'],
    ['/agent/commissions', 'Earnings'],
    ['/agent/rates', 'Commission rates'],
    ['/agent/recruit', 'Recruit'],
    ['/agent/kyc', 'KYC & payout'],
  ],
  account: [
    ['/account', 'Overview'],
    ['/account/favorites', 'Favorites'],
    ['/account/enquiries', 'My enquiries'],
    ['/account/activity', 'Activity'],
    ['/account/profile', 'Profile'],
  ],
};

export default function DashboardLayout({ area }) {
  const menu = MENUS[area] || [];
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen((v) => !v)}>☰</button>
          <Link to="/" className="flex items-center gap-2">
            <Logo imgClassName="h-7" />
            <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 capitalize">{area}</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{user?.name}</span>
          <button className="btn-ghost" onClick={async () => { await dispatch(logout()); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className={clsx(
          'fixed inset-y-14 left-0 z-20 w-60 border-r border-slate-200 bg-white p-3 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}>
          <nav className="space-y-1">
            {menu.map(([to, label]) => (
              <NavLink key={to} to={to} end={to.split('/').length === 2}
                onClick={() => setOpen(false)}
                className={({ isActive }) => clsx(
                  'block rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}>
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
