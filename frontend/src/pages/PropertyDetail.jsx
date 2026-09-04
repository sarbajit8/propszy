import { useParams, Link } from 'react-router-dom';
import { useProperty } from '../lib/queries';
import { inr, STATUS_LABEL } from '../lib/format';
import { PageLoader, StatusBadge } from '../components/ui';
import EnquiryForm from '../components/EnquiryForm';
import FavoriteButton from '../components/FavoriteButton';
import MapView from '../components/MapView';

export default function PropertyDetail() {
  const { id } = useParams();
  const { data: p, isLoading, isError } = useProperty(id);

  if (isLoading) return <PageLoader />;
  if (isError || !p) return <div className="container-app py-20 text-center text-slate-500">Unit not found.</div>;

  const images = p.media?.filter((m) => m.kind === 'IMAGE') || [];
  const hero = images[0]?.url || `https://picsum.photos/seed/${p.id}/1200/700`;
  const lat = p.resolvedLat ?? p.project?.lat;
  const lng = p.resolvedLng ?? p.project?.lng;

  return (
    <div className="container-app py-8">
      <nav className="mb-4 text-sm text-slate-400">
        <Link to="/projects" className="hover:text-brand-700">Projects</Link> /{' '}
        <Link to={`/projects/${p.project?.slug || p.project?.id}`} className="hover:text-brand-700">{p.project?.name}</Link> /{' '}
        <span className="text-slate-600">{p.unitType}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <img src={hero} alt={p.unitType} className="aspect-[16/9] w-full rounded-xl border border-slate-200 object-cover" />
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {images.slice(1, 8).map((m) => (
                <img key={m.id} src={m.url} alt="" className="h-20 w-28 flex-shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          )}

          <div className="mt-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{p.unitType} — {p.project?.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{[p.project?.address, p.project?.city].filter(Boolean).join(', ')}</p>
              <div className="mt-2"><StatusBadge status={p.status} label={STATUS_LABEL[p.status]} /></div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{inr(p.price)}</p>
              <FavoriteButton propertyId={p.id} className="btn-outline mt-2" />
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Carpet area', p.carpetArea ? `${p.carpetArea} ${p.areaUnit || 'sqft'}` : '—'],
              ['Built-up', p.builtUpArea ? `${p.builtUpArea} ${p.areaUnit || 'sqft'}` : '—'],
              ['Bedrooms', p.bedrooms ?? '—'],
              ['Bathrooms', p.bathrooms ?? '—'],
              ['Facing', p.facing || '—'],
              ['Floor', p.floor || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase text-slate-400">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {p.media?.some((m) => m.kind === 'FLOOR_PLAN') && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Floor plan</h3>
              <img src={p.media.find((m) => m.kind === 'FLOOR_PLAN').url} alt="Floor plan" className="rounded-xl border border-slate-200" />
            </div>
          )}

          {lat && lng && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Location</h3>
              <MapView single center={{ lat, lng }} pins={[{ ...p, name: p.project?.name, lat, lng }]} height={320} />
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <EnquiryForm projectId={p.projectId} propertyId={p.id} />
        </aside>
      </div>
    </div>
  );
}
