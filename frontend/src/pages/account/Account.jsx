import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, unwrap } from '../../lib/api';
import { selectUser } from '../../features/auth/authSlice';
import { fromNow } from '../../lib/format';
import { PageLoader } from '../../components/ui';

export function AccountOverview() {
  const user = useSelector(selectUser);
  const { data: enquiries } = useQuery({ queryKey: ['me-enq'], queryFn: () => api.get('/me/enquiries', { params: { limit: 5 } }).then((r) => r.data) });
  const { data: favs } = useQuery({ queryKey: ['me-fav'], queryFn: () => unwrap(api.get('/favorites')) });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Hi {user?.name?.split(' ')[0]} 👋</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Saved items" value={favs?.length ?? '—'} to="/account/favorites" />
        <Stat label="Enquiries" value={enquiries?.meta?.total ?? '—'} to="/account/enquiries" />
        <Stat label="KYC status" value={user?.kycStatus?.replace('_', ' ') || '—'} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent enquiries</h2>
          <Link to="/account/enquiries" className="text-sm text-brand-700 hover:underline">View all</Link>
        </div>
        <div className="card divide-y divide-slate-100">
          {(enquiries?.data || []).map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{l.project?.name}</p>
                <p className="text-xs text-slate-400">{l.code} · {fromNow(l.createdAt)}</p>
              </div>
              <span className="badge bg-brand-50 text-brand-700">{l.statusKey}</span>
            </div>
          ))}
          {!enquiries?.data?.length && <p className="px-4 py-6 text-center text-sm text-slate-400">No enquiries yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, to }) {
  const inner = (
    <div className="card p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold capitalize">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export function Favorites() {
  const { data: favs, isLoading, refetch } = useQuery({ queryKey: ['favorites'], queryFn: () => unwrap(api.get('/favorites')) });
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Favorites</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(favs || []).map((f) => {
          const target = f.project
            ? { title: f.project.name, to: `/projects/${f.project.slug || f.project.id}`, img: f.project.media?.[0]?.url }
            : { title: `${f.property.unitType} — ${f.property.project?.name}`, to: `/properties/${f.property.id}` };
          return (
            <div key={f.id} className="card overflow-hidden">
              <img src={target.img || `https://picsum.photos/seed/${f.id}/480/300`} alt="" className="aspect-[16/10] w-full object-cover" />
              <div className="p-3">
                <Link to={target.to} className="font-medium hover:text-brand-700">{target.title}</Link>
                <button
                  onClick={async () => {
                    await api.post('/favorites/toggle', f.project ? { projectId: f.project.id } : { propertyId: f.property.id });
                    refetch();
                  }}
                  className="mt-2 block text-xs text-rose-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!favs?.length && <p className="text-sm text-slate-400">You haven&apos;t saved anything yet.</p>}
    </div>
  );
}

export function Enquiries() {
  const { data, isLoading } = useQuery({ queryKey: ['enquiries'], queryFn: () => api.get('/me/enquiries').then((r) => r.data) });
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My enquiries</h1>
      <div className="card divide-y divide-slate-100">
        {(data?.data || []).map((l) => (
          <div key={l.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Link to={`/projects/${l.project?.slug || l.project?.id}`} className="font-medium hover:text-brand-700">
                {l.project?.name}{l.property ? ` · ${l.property.unitType}` : ''}
              </Link>
              <span className="badge bg-brand-50 text-brand-700">{l.statusKey}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{l.code} · raised {fromNow(l.createdAt)}</p>
            {l.message && <p className="mt-1 text-sm text-slate-600">{l.message}</p>}
          </div>
        ))}
        {!data?.data?.length && <p className="px-4 py-6 text-center text-sm text-slate-400">No enquiries yet.</p>}
      </div>
    </div>
  );
}

export function Activity() {
  const { data, isLoading } = useQuery({ queryKey: ['activity'], queryFn: () => api.get('/me/activity').then((r) => r.data) });
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Activity log</h1>
      <div className="card divide-y divide-slate-100">
        {(data?.data || []).map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="capitalize">{a.action.replace(/[._]/g, ' ')}</span>
            <span className="text-xs text-slate-400">{fromNow(a.createdAt)}</span>
          </div>
        ))}
        {!data?.data?.length && <p className="px-4 py-6 text-center text-sm text-slate-400">No activity recorded.</p>}
      </div>
    </div>
  );
}
