import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../lib/queries';
import { priceRange, STATUS_LABEL, TYPE_LABEL, inr } from '../lib/format';
import { PageLoader, StatusBadge } from '../components/ui';
import EnquiryForm from '../components/EnquiryForm';
import FavoriteButton from '../components/FavoriteButton';
import MapView from '../components/MapView';

function videoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { type: 'video', src: url };
}

export default function ProjectDetail() {
  const { idOrSlug } = useParams();
  const { data: project, isLoading, isError } = useProject(idOrSlug);
  const [tab, setTab] = useState('Overview');

  if (isLoading) return <PageLoader />;
  if (isError || !project) return <div className="container-app py-20 text-center text-slate-500">Project not found.</div>;

  const images = project.media?.filter((m) => m.kind === 'IMAGE') || [];
  const floorPlans = project.media?.filter((m) => m.kind === 'FLOOR_PLAN') || [];
  const masterPlans = project.media?.filter((m) => m.kind === 'MASTER_PLAN') || [];
  if (project.masterPlanUrl) masterPlans.unshift({ id: 'mp0', url: project.masterPlanUrl, title: 'Master plan' });
  const gallery = images.length ? images : [{ id: 'ph', url: `https://picsum.photos/seed/${project.id}/1200/700` }];
  const inventory = project.inventory || [];
  const video = videoEmbed(project.featuredVideoUrl);
  const TABS = ['Overview', 'Inventory', 'Plans', ...(video ? ['Video'] : []), 'Amenities', 'Location', 'Enquire'];

  return (
    <div className="container-app py-8">
      <nav className="mb-4 text-sm text-slate-400">
        <Link to="/projects" className="hover:text-brand-700">Projects</Link> / <span className="text-slate-600">{project.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {/* Gallery */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200">
            <img src={gallery[0].url} alt={project.name} className="aspect-[16/9] w-full object-cover" />
            {video && (
              <button onClick={() => setTab('Video')}
                className="absolute inset-0 grid place-items-center bg-black/20 transition hover:bg-black/30">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-700 shadow-lg">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </button>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {gallery.slice(0, 8).map((m) => (
                <img key={m.id} src={m.url} alt="" className="h-20 w-28 flex-shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{TYPE_LABEL[project.type]}</p>
              <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {[project.address, project.city, project.state].filter(Boolean).join(', ')}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={project.status} label={STATUS_LABEL[project.status]} />
                {project.reraNo && <span className="badge bg-slate-100 text-slate-600">RERA: {project.reraNo}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{priceRange(project.priceMin, project.priceMax)}</p>
              <FavoriteButton projectId={project.id} className="btn-outline mt-2" />
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                  tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="py-6">
            {tab === 'Overview' && (
              <div className="prose prose-sm max-w-none text-slate-600">
                {project.developer && (
                  <div className="not-prose mb-5 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
                      {project.developer.logoUrl
                        ? <img src={project.developer.logoUrl} alt="" className="h-full w-full object-contain" />
                        : <span className="text-sm font-bold text-brand-700">{project.developer.name.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase text-slate-400">Developed by</p>
                      <p className="text-sm font-semibold text-slate-800">{project.developer.name}</p>
                    </div>
                    {project.developer.website && (
                      <a href={project.developer.website} target="_blank" rel="noreferrer"
                        className="ml-auto text-xs font-medium text-brand-700 hover:underline">Visit site →</a>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-line">{project.description || 'No description provided.'}</p>

                {inventory.length > 0 && (
                  <div className="not-prose mt-6">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Available configurations</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {inventory.map((g) => (
                        <button key={g.label} onClick={() => setTab('Inventory')}
                          className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:shadow-sm">
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-slate-800">{g.label}</span>
                            <span className="text-xs text-slate-400">{g.total} unit{g.total === 1 ? '' : 's'}</span>
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-brand-700">
                            {g.priceMin ? priceRange(g.priceMin, g.priceMax) : 'Price on request'}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {g.configs.map((c) => `${c.label} (${c.count})`).join(' · ')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <dl className="mt-6 grid grid-cols-2 gap-4 not-prose sm:grid-cols-3">
                  {[
                    ['Developer', project.developer?.name || project.builder],
                    ['Type', TYPE_LABEL[project.type]],
                    ['Status', STATUS_LABEL[project.status]],
                    ['Total units', project.counts?.properties],
                    ['City', project.city],
                    ['Pincode', project.pincode],
                  ].map(([k, val]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase text-slate-400">{k}</dt>
                      <dd className="text-sm font-medium text-slate-800">{val || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {tab === 'Inventory' && (
              <div className="space-y-6">
                {inventory.length === 0 && <p className="text-sm text-slate-400">No units listed yet.</p>}
                {inventory.map((g) => {
                  const rows = (project.properties || []).filter(
                    (u) => (u.category?.name || '') === g.label || (!u.category && g.label === 'Other')
                  );
                  const list = rows.length ? rows : (project.properties || []);
                  return (
                    <div key={g.label}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="font-semibold text-slate-800">
                          {g.label} <span className="ml-1 text-sm font-normal text-slate-400">· {g.total} unit{g.total === 1 ? '' : 's'} ({g.available} available)</span>
                        </h3>
                        <span className="text-sm font-medium text-brand-700">{g.priceMin ? priceRange(g.priceMin, g.priceMax) : ''}</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                            <tr><th className="px-3 py-2">Unit</th><th>Area</th><th>Facing</th><th>Floor</th><th>Price</th><th>Status</th><th /></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(rows.length ? rows : []).map((u) => (
                              <tr key={u.id}>
                                <td className="px-3 py-2.5 font-medium">{u.unitType}</td>
                                <td>{u.carpetArea ? `${u.carpetArea} ${u.areaUnit || 'sqft'}` : '—'}</td>
                                <td>{u.facing || '—'}</td>
                                <td>{u.floor || '—'}</td>
                                <td>{inr(u.price)}</td>
                                <td><StatusBadge status={u.status} /></td>
                                <td className="pr-3"><Link to={`/properties/${u.id}`} className="text-brand-700 hover:underline">View</Link></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!rows.length && <p className="px-1 py-2 text-xs text-slate-400">{list.length} units — open individual units for details.</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'Plans' && (
              <div className="space-y-6">
                {masterPlans.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Master plan</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {masterPlans.map((m) => (
                        <figure key={m.id} className="card overflow-hidden">
                          <img src={m.url} alt={m.title || 'Master plan'} className="w-full object-contain" />
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Floor plans</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {floorPlans.length ? floorPlans.map((m) => (
                      <figure key={m.id} className="card overflow-hidden">
                        <img src={m.url} alt={m.title || 'Floor plan'} className="w-full object-contain" />
                        <figcaption className="p-2 text-center text-xs text-slate-500">{m.title}</figcaption>
                      </figure>
                    )) : <p className="text-sm text-slate-400">No floor plans uploaded.</p>}
                  </div>
                </div>
              </div>
            )}

            {tab === 'Video' && video && (
              <div className="overflow-hidden rounded-xl bg-black">
                {video.type === 'iframe' ? (
                  <iframe src={video.src} title="Project video" allowFullScreen
                    className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                ) : (
                  <video src={video.src} controls className="aspect-video w-full" />
                )}
              </div>
            )}

            {tab === 'Amenities' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(project.amenities || []).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="text-brand-600">◆</span> {a.name}
                  </div>
                ))}
                {!project.amenities?.length && <p className="text-sm text-slate-400">No amenities listed.</p>}
              </div>
            )}

            {tab === 'Location' && (
              <div>
                <MapView single center={project.lat && project.lng ? { lat: project.lat, lng: project.lng } : undefined}
                  pins={[project]} height={360} />
                <p className="mt-2 text-sm text-slate-500">
                  {[project.address, project.city, project.state, project.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {tab === 'Enquire' && <EnquiryForm projectId={project.id} />}
          </div>
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <EnquiryForm projectId={project.id} />
          {project.brochureUrl && (
            <a href={project.brochureUrl} target="_blank" rel="noreferrer" className="btn-outline mt-3 w-full">
              Download brochure (PDF)
            </a>
          )}
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-slate-200 bg-white p-3 lg:hidden">
        <FavoriteButton projectId={project.id} className="btn-outline" />
        <button className="btn-primary flex-1" onClick={() => { setTab('Enquire'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>
          Enquire now
        </button>
      </div>
    </div>
  );
}
