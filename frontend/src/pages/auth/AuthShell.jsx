import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <Logo tone="light" imgClassName="h-9 rounded bg-white/95 p-1" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Real estate, organised.</h2>
          <p className="mt-3 max-w-sm text-brand-100">
            Projects, units, verified agents and a transparent commission network — all in one place.
          </p>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} Propszy</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
