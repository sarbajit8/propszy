import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';
import { useFavorites } from '../lib/queries';
import { PageLoader, EmptyState } from '../components/ui';
import ProjectCard from '../components/ProjectCard';
import PropertyCard from '../components/PropertyCard';

function RemoveOverlay({ onRemove }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
      className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-rose-600 shadow-sm backdrop-blur transition hover:bg-white"
      title="Remove from wishlist"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function Wishlist() {
  const qc = useQueryClient();
  const { data: favs, isLoading } = useFavorites();
  const [tab, setTab] = useState('all');

  const { projects, properties } = useMemo(() => {
    const p = [], u = [];
    (favs || []).forEach((f) => {
      if (f.project) p.push({ favId: f.id, ...f.project });
      else if (f.property) u.push({ favId: f.id, ...f.property });
    });
    return { projects: p, properties: u };
  }, [favs]);

  const remove = async (favId, payload) => {
    try {
      await api.post('/favorites/toggle', payload);
      qc.setQueryData(['favorites'], (old) => (old || []).filter((f) => f.id !== favId));
      qc.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from wishlist');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (isLoading) return <PageLoader />;

  const total = projects.length + properties.length;
  const showProjects = tab !== 'properties';
  const showProperties = tab !== 'projects';

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-app py-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Your list</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Wishlist</h1>
          <p className="mt-1 text-sm text-slate-500">{total} saved item{total === 1 ? '' : 's'}</p>

          {total > 0 && (
            <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
              {[['all', `All (${total})`], ['projects', `Projects (${projects.length})`], ['properties', `Units (${properties.length})`]].map(([v, l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className={`rounded-md px-3 py-1.5 font-medium ${tab === v ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container-app py-8">
        {total === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            hint="Tap the heart on any project or unit to save it here."
            action={<Link to="/projects" className="btn-primary mt-2">Browse projects</Link>}
          />
        ) : (
          <div className="space-y-10">
            {showProjects && projects.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-bold">Projects</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((p) => (
                    <div key={p.favId} className="relative">
                      <RemoveOverlay onRemove={() => remove(p.favId, { projectId: p.id })} />
                      <ProjectCard project={p} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showProperties && properties.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-bold">Units</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.map((u) => (
                    <div key={u.favId} className="relative">
                      <RemoveOverlay onRemove={() => remove(u.favId, { propertyId: u.id })} />
                      <PropertyCard property={u} hideFav />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showProjects && !showProperties && projects.length === 0 && (
              <EmptyState title="No saved projects" hint="Switch to Units, or save some projects." />
            )}
            {showProperties && !showProjects && properties.length === 0 && (
              <EmptyState title="No saved units" hint="Switch to Projects, or save some units." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
