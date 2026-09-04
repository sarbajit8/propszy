import { Link } from 'react-router-dom';
import Logo from './Logo';

const COLS = [
  {
    title: 'Propszy',
    links: [
      ['About us', '/blog'],
      ['Careers', '/blog'],
      ['Terms & conditions', '/blog'],
      ['Privacy policy', '/blog'],
      ['Contact us', '/register'],
    ],
  },
  {
    title: 'Explore',
    links: [
      ['All projects', '/projects'],
      ['All properties', '/properties'],
      ['Map view', '/map'],
      ['New launches', '/projects?status=UPCOMING'],
      ['Ready to move', '/projects?status=READY_TO_MOVE'],
    ],
  },
  {
    title: 'Property types',
    links: [
      ['Residential', '/projects?type=RESIDENTIAL'],
      ['Commercial', '/projects?type=COMMERCIAL'],
      ['Plots & land', '/projects?type=PLOT'],
      ['1 BHK', '/properties?bedrooms=1'],
      ['2 BHK', '/properties?bedrooms=2'],
      ['3 BHK', '/properties?bedrooms=3'],
    ],
  },
  {
    title: 'For partners',
    links: [
      ['Become an agent', '/become-agent'],
      ['Agent login', '/login'],
      ['Post a project', '/register'],
      ['Advertise with us', '/register'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['Blog', '/blog'],
      ['Buying guides', '/blog?category=Buying%20Guide'],
      ['Home loan help', '/blog?category=Finance'],
      ['Market trends', '/blog?category=Market%20Trends'],
    ],
  },
];

const CITIES = ['Bengaluru', 'Pune', 'Mumbai', 'Hyderabad', 'Gurugram', 'Chennai', 'Delhi', 'Noida', 'Kolkata', 'Ahmedabad'];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-app py-12">
        <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="sm:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-slate-500">
              RERA-first real estate — discover projects, compare units and connect with verified agents.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-slate-900">{col.title}</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                {col.links.map(([label, to]) => (
                  <li key={label}><Link to={to} className="hover:text-brand-700">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6">
          <h4 className="text-sm font-semibold text-slate-900">Property in top cities</h4>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            {CITIES.map((c) => (
              <Link key={c} to={`/projects?city=${encodeURIComponent(c)}`} className="hover:text-brand-700">
                Property in {c}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Propszy. All rights reserved. Listings are indicative; verify details with the developer.
      </div>
    </footer>
  );
}
