import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, unwrap, apiError } from '../../lib/api';
import { selectUser } from '../../features/auth/authSlice';
import { fromNow, inr } from '../../lib/format';
import { PageLoader, EmptyState } from '../../components/ui';
import ProjectCard from '../../components/ProjectCard';
import PropertyCard from '../../components/PropertyCard';

const Icon = {
  heart: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" /></svg>,
  chat: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.7 8.7 0 0 1-3.4-.7L3 21l1.8-5.4A8.4 8.4 0 0 1 12.6 3a8.4 8.4 0 0 1 8.4 8.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  building: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M4 21h16M9 21v-4h2v4M9 8h1M14 8h1M9 12h1M14 12h1M15 21V11h4a1 1 0 0 1 1 1v9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  search: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>,
  plus: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" {...p}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>,
  map: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z" strokeLinejoin="round" /><path d="M9 4v13M15 7v13" /></svg>,
  arrow: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" {...p}><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  clock: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  pin: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg>,
  activity: {
    'auth.login': (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    'auth.otp_login': (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    'auth.register': (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" strokeLinecap="round" /></svg>,
    'property.view': (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>,
  },
  default: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /></svg>,
};

const GLASS = 'rounded-2xl border border-white/60 bg-white/70 shadow-sm shadow-slate-200/40 backdrop-blur-xl';

const STATUS_STYLE = {
  NEW: 'bg-brand-50 text-brand-700',
  CONTACTED: 'bg-amber-50 text-amber-700',
  QUALIFIED: 'bg-indigo-50 text-indigo-700',
  SITE_VISIT: 'bg-sky-50 text-sky-700',
  NEGOTIATION: 'bg-orange-50 text-orange-700',
  CONVERTED: 'bg-emerald-50 text-emerald-700',
  LOST: 'bg-rose-50 text-rose-700',
};

export function AccountOverview() {
  const user = useSelector(selectUser);
  const { data: enquiries } = useQuery({ queryKey: ['me-enq'], queryFn: () => api.get('/me/enquiries', { params: { limit: 5 } }).then((r) => r.data) });
  const { data: favs } = useQuery({ queryKey: ['me-fav'], queryFn: () => unwrap(api.get('/favorites')) });
  const { data: myProps } = useQuery({ queryKey: ['me-props'], queryFn: () => api.get('/properties', { params: { mine: true, limit: 1 } }).then((r) => r.data) });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-brand-100">Welcome back</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Hi, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-2 max-w-md text-sm text-brand-100">Here's a quick look at your saved projects, enquiries and listings.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/properties" className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <Icon.search /> Browse properties
            </Link>
            <Link to="/account/properties/new" className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20">
              <Icon.plus /> List a property
            </Link>
            <Link to="/map" className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20">
              <Icon.map /> Explore map
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat i={0} label="Saved items" value={favs?.length ?? '—'} to="/account/favorites" icon={Icon.heart} tint="bg-rose-50 text-rose-600" />
        <Stat i={1} label="Enquiries" value={enquiries?.meta?.total ?? '—'} to="/account/enquiries" icon={Icon.chat} tint="bg-sky-50 text-sky-600" />
        <Stat i={2} label="My properties" value={myProps?.meta?.total ?? '—'} to="/account/properties" icon={Icon.building} tint="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`lg:col-span-2 ${GLASS}`}>
          <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent enquiries</h2>
            <Link to="/account/enquiries" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              View all <Icon.arrow />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(enquiries?.data || []).map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon.chat width="16" height="16" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{l.project?.name || l.property?.unitType || 'Enquiry'}</p>
                  <p className="text-xs text-slate-400">{l.code} · {fromNow(l.createdAt)}</p>
                </div>
                <span className={`badge shrink-0 ${STATUS_STYLE[l.statusKey] || 'bg-slate-100 text-slate-600'}`}>{l.statusKey?.replace('_', ' ')}</span>
              </div>
            ))}
            {!enquiries?.data?.length && (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No enquiries yet — enquire on any project or unit to see it here.</p>
            )}
          </div>
        </section>

        <FavoritesBreakdown favs={favs} />
      </div>
    </div>
  );
}

function FavoritesBreakdown({ favs }) {
  const projects = favs?.filter((f) => f.project).length || 0;
  const properties = favs?.filter((f) => f.property).length || 0;
  const total = projects + properties;
  const data = [
    { name: 'Projects', value: projects, color: '#7c3aed' },
    { name: 'Units', value: properties, color: '#22c55e' },
  ];

  return (
    <section className={`p-5 ${GLASS}`}>
      <h2 className="font-semibold text-slate-900">What you've saved</h2>
      {total === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-500"><Icon.heart /></span>
          <p className="text-sm text-slate-400">Nothing saved yet</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-36 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3} strokeWidth={0}>
                  {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="text-2xl font-extrabold text-slate-900">{total}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs">
            {data.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ i = 0, label, value, to, icon: IconFn, tint }) {
  return (
    <Link to={to} style={{ animationDelay: `${i * 70}ms` }}
      className={`group flex animate-fade-up items-center gap-3.5 p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60 ${GLASS}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}><IconFn /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
      <Icon.arrow className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </Link>
  );
}

export function Favorites() {
  const { data: favs, isLoading, refetch } = useQuery({ queryKey: ['favorites'], queryFn: () => unwrap(api.get('/favorites')) });
  if (isLoading) return <PageLoader />;

  const remove = async (payload) => {
    await api.post('/favorites/toggle', payload);
    refetch();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Favorites</h1>
        <p className="text-sm text-slate-500">{favs?.length || 0} project{favs?.length === 1 ? '' : 's'} &amp; unit{favs?.length === 1 ? '' : 's'} saved.</p>
      </div>

      {!favs?.length ? (
        <EmptyState
          title="You haven't saved anything yet"
          hint="Tap the heart on any project or unit to save it here."
          action={<Link to="/projects" className="btn-primary mt-2">Browse projects</Link>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favs.map((f) => (
            <div key={f.id} className="relative">
              <button
                onClick={() => remove(f.project ? { projectId: f.project.id } : { propertyId: f.property.id })}
                className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-rose-600 shadow-sm backdrop-blur hover:bg-white"
                title="Remove from favorites"
              >
                <Icon.heart width="16" height="16" fill="currentColor" />
              </button>
              {f.project ? <ProjectCard project={f.project} /> : <PropertyCard property={f.property} hideFav />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Enquiries() {
  const { data, isLoading } = useQuery({ queryKey: ['enquiries'], queryFn: () => api.get('/me/enquiries').then((r) => r.data) });
  if (isLoading) return <PageLoader />;
  const rows = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My enquiries</h1>
        <p className="text-sm text-slate-500">Every enquiry you've raised, with its current status.</p>
      </div>

      {!rows.length ? (
        <EmptyState title="No enquiries yet" hint="Enquire on a project or unit and it'll show up here." />
      ) : (
        <div className="space-y-3">
          {rows.map((l) => (
            <div key={l.id} className={`flex gap-3 p-4 ${GLASS}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon.chat width="17" height="17" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/projects/${l.project?.slug || l.project?.id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                    {l.project?.name}{l.property ? ` · ${l.property.unitType}` : ''}
                  </Link>
                  <span className={`badge ${STATUS_STYLE[l.statusKey] || 'bg-slate-100 text-slate-600'}`}>{l.statusKey?.replace('_', ' ')}</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Icon.clock width="12" height="12" /> {l.code} · raised {fromNow(l.createdAt)}
                </p>
                {l.message && <p className="mt-2 text-sm text-slate-600">{l.message}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyProperties() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['my-properties'],
    queryFn: () => api.get('/properties', { params: { mine: true, limit: 100 } }).then((r) => r.data),
  });

  const remove = async (r) => {
    if (!confirm(`Delete "${r.name || r.unitType}"? This can't be undone.`)) return;
    try {
      await api.delete(`/properties/${r.id}`);
      toast.success('Listing deleted');
      qc.invalidateQueries({ queryKey: ['my-properties'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  if (isLoading) return <PageLoader />;
  const rows = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My properties</h1>
          <p className="text-sm text-slate-500">Listings you've submitted — each is reviewed by our team before it goes live.</p>
        </div>
        <Link to="/account/properties/new" className="btn-primary flex shrink-0 items-center gap-1.5"><Icon.plus /> List a property</Link>
      </div>

      {!rows.length ? (
        <EmptyState
          title="You haven't listed anything yet"
          hint="Add your first property — it only takes a few minutes."
          action={<Link to="/account/properties/new" className="btn-primary mt-2">List a property</Link>}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className={`flex items-center gap-3.5 p-4 ${GLASS}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon.building /></span>
              <div className="min-w-0 flex-1">
                <Link to={`/account/properties/${r.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.name || r.unitType}</Link>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <Icon.pin /> {[r.city, r.state].filter(Boolean).join(', ') || 'Location not set'} · {r.price ? inr(r.price) : 'Price not set'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <span className={`badge ${r.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {r.isPublished ? 'Live' : 'Pending review'}
                </span>
                <Link to={`/account/properties/${r.id}`} className="font-medium text-brand-700 hover:underline">Edit</Link>
                <button onClick={() => remove(r)} className="font-medium text-rose-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Activity() {
  const { data, isLoading } = useQuery({ queryKey: ['activity'], queryFn: () => api.get('/me/activity').then((r) => r.data) });
  if (isLoading) return <PageLoader />;
  const rows = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Activity log</h1>
        <p className="text-sm text-slate-500">A record of recent actions on your account.</p>
      </div>

      {!rows.length ? (
        <EmptyState title="No activity recorded" hint="Your sign-ins and views will show up here." />
      ) : (
        <div className={GLASS}>
          <div className="divide-y divide-white/60">
            {rows.map((a) => {
              const ActionIcon = Icon.activity[a.action] || Icon.default;
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><ActionIcon /></span>
                  <span className="flex-1 text-sm capitalize text-slate-700">{a.action.replace(/[._]/g, ' ')}</span>
                  <span className="text-xs text-slate-400">{fromNow(a.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
