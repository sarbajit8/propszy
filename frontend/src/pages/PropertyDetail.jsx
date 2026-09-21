import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProperty } from '../lib/queries';
import { inr, STATUS_LABEL, videoEmbed } from '../lib/format';
import { PageLoader, StatusBadge } from '../components/ui';
import EnquiryForm from '../components/EnquiryForm';
import FavoriteButton from '../components/FavoriteButton';
import MapView from '../components/MapView';
import ImageLightbox from '../components/ImageLightbox';

const INTENT_LABEL = { SALE: 'For Sale', RENT: 'For Rent', PG: 'PG / Co-living' };

const Icon = {
  area: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4m12-6v4a2 2 0 0 1-2 2h-4" /></svg>,
  bed: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 12V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 12h18M3 12v5m18-5v5M6 9h4" /></svg>,
  bath: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM7 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2M5 19l-1 2m15-2l1 2" /></svg>,
  compass: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /><path d="M16 8l-2 6-6 2 2-6 6-2z" /></svg>,
  layers: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" /><path d="M3 13l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ruler: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v3M15 8v3" strokeLinecap="round" /></svg>,
  pin: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg>,
  directions: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M21 3L3 10.5l7.5 3L13.5 21 21 3z" strokeLinejoin="round" /></svg>,
  external: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M14 4h6v6M20 4l-9 9M6 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const Spec = ({ icon: IconFn, label, value }) => value ? (
  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><IconFn /></span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase text-slate-400">{label}</p>
      <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
    </div>
  </div>
) : null;

function ChipGroup({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <span key={a} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{a}</span>
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const { data: p, isLoading, isError } = useProperty(id);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(null);

  if (isLoading) return <PageLoader />;
  if (isError || !p) return <div className="container-app py-20 text-center text-slate-500">Unit not found.</div>;

  const d = p.details || {};
  const images = p.media?.filter((m) => m.kind === 'IMAGE') || [];
  const plans = p.media?.filter((m) => m.kind === 'FLOOR_PLAN' || m.kind === 'MASTER_PLAN') || [];
  const heroIndex = activeImg < images.length ? activeImg : 0;
  const hero = images[heroIndex]?.url || `https://picsum.photos/seed/${p.id}/1200/700`;
  const lat = p.resolvedLat ?? p.lat ?? p.project?.lat;
  const lng = p.resolvedLng ?? p.lng ?? p.project?.lng;
  const location = [p.resolvedAddress, d.subLocality, p.resolvedCity, p.resolvedState].filter(Boolean).join(', ');
  const title = p.name || p.unitType;
  const video = videoEmbed(p.videoUrl);
  const isPlot = d.plotLength != null || d.plotBreadth != null || d.openSides != null;
  const amenityTags = d.amenityTags || {};
  const psf = p.price && p.carpetArea ? Math.round(Number(p.price) / Number(p.carpetArea)) : d.pricePerSqft;
  const isSoldOut = p.status === 'SOLD' || (p.availableUnits != null && p.availableUnits <= 0);
  const totalUnits = p.totalUnits ?? 1;
  const availableUnits = isSoldOut ? 0 : (p.availableUnits ?? 1);

  const mapsSearchUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;
  const mapsDirectionsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

  return (
    <div className="container-app py-8">
      <nav className="mb-4 text-sm text-slate-400">
        <Link to="/properties" className="hover:text-brand-700">Properties</Link>
        {p.project && (
          <> / <Link to={`/projects/${p.project.slug || p.project.id}`} className="hover:text-brand-700">{p.project.name}</Link></>
        )}
        {' '}/ <span className="text-slate-600">{title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div>
            <img src={hero} alt={title} className="aspect-[16/9] w-full rounded-xl border border-slate-200 object-cover" />
            {images.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {images.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${i === heroIndex ? 'border-brand-600' : 'border-transparent'}`}
                  >
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {isSoldOut ? (
                    <span className="badge bg-rose-600 font-extrabold text-white shadow-sm">
                      SOLD OUT
                    </span>
                  ) : (
                    <>
                      <StatusBadge status={p.status} label={STATUS_LABEL[p.status]} />
                      <span className="badge bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-200">
                        {availableUnits} of {totalUnits} Available
                      </span>
                    </>
                  )}
                  <span className="badge bg-brand-50 text-brand-700">{INTENT_LABEL[p.listingIntent] || p.listingIntent}</span>
                </div>
                <h1 className="mt-2 text-2xl font-bold">{title}</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {[p.name ? p.unitType : null, p.project?.name].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Icon.pin className="shrink-0 text-slate-400" /> {location || '—'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${isSoldOut ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{inr(p.price)}</p>
                {isSoldOut ? (
                  <p className="text-xs font-bold text-rose-600">Property Sold Out</p>
                ) : (
                  psf && <p className="text-xs text-slate-400">{inr(psf)}/sqft</p>
                )}
                {!isSoldOut && d.priceNegotiable && <p className="text-xs font-medium text-emerald-600">Negotiable</p>}
                <FavoriteButton propertyId={p.id} className="btn-outline mt-2" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Spec icon={Icon.area} label={isPlot ? 'Plot area' : 'Carpet area'} value={p.carpetArea ? `${p.carpetArea} ${p.areaUnit || 'sqft'}` : null} />
              {isPlot ? (
                <>
                  <Spec icon={Icon.ruler} label="Dimensions" value={d.plotLength && d.plotBreadth ? `${d.plotLength} × ${d.plotBreadth} ft` : null} />
                  <Spec icon={Icon.layers} label="Open sides" value={d.openSides} />
                  <Spec icon={Icon.compass} label="Facing" value={p.facing} />
                </>
              ) : (
                <>
                  <Spec icon={Icon.bed} label="Bedrooms" value={p.bedrooms ?? null} />
                  <Spec icon={Icon.bath} label="Bathrooms" value={p.bathrooms ?? null} />
                  <Spec icon={Icon.compass} label="Facing" value={p.facing} />
                </>
              )}
            </div>
          </div>

          {p.description && (
            <section>
              <h2 className="mb-2 text-base font-semibold">About this property</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.description}</p>
            </section>
          )}

          {video && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Featured Video &amp; Virtual Tour</h2>
                  <p className="text-xs text-slate-500">Video walkthrough of this property</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl bg-black shadow-inner">
                {video.type === 'iframe' ? (
                  <iframe src={video.src} title="Property video" allowFullScreen
                    className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                ) : (
                  <video
                    key={video.src}
                    src={video.src}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full"
                  >
                    <source src={video.src} type="video/mp4" />
                    Your browser does not support HTML5 video playback.
                  </video>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-base font-semibold">Property details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
              <Fact label="Built-up area" value={p.builtUpArea ? `${p.builtUpArea} ${p.areaUnit || 'sqft'}` : null} />
              <Fact label="Floor" value={p.floor} />
              <Fact label="Total units" value={totalUnits > 1 ? `${totalUnits} units` : '1 unit'} />
              <Fact label="Available stock" value={isSoldOut ? 'Sold Out (0)' : `${availableUnits} unit${availableUnits === 1 ? '' : 's'}`} />
              <Fact label="Ownership" value={d.ownership} />
              <Fact label="Road width" value={d.roadWidthFt ? `${d.roadWidthFt} ft` : null} />
              <Fact label="Approved for" value={d.approvedIndustryType} />
              <Fact label="Construction" value={isPlot ? (d.isConstructed === true ? 'Constructed' : d.isConstructed === false ? 'Vacant plot' : null) : null} />
              <Fact label="Construction type" value={d.constructionTypes?.length ? d.constructionTypes.join(', ') : null} />
              <Fact label="Tax & charges" value={d.taxExcluded ? 'Excluded' : null} />
              <Fact label="Pre-leased" value={d.isPreLeased === true ? 'Yes' : d.isPreLeased === false ? 'No' : null} />
              {d.isPreLeased && (
                <>
                  <Fact label="Current rent" value={d.preLeasedRent ? `${inr(d.preLeasedRent)}/mo` : null} />
                  <Fact label="Lease tenure" value={d.preLeasedTenureYears ? `${d.preLeasedTenureYears} yrs` : null} />
                  <Fact label="Expected returns" value={d.expectedReturnsPercent ? `${d.expectedReturnsPercent}%` : null} />
                </>
              )}
            </dl>
          </section>

          {plans.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold">Plans &amp; maps</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.map((m) => {
                  const label = m.title || (m.kind === 'MASTER_PLAN' ? 'Master plan' : 'Floor plan');
                  return (
                    <figure key={m.id} className="group overflow-hidden rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setLightbox({ src: m.url, alt: label })}
                        className="relative block w-full cursor-zoom-in"
                      >
                        <img src={m.url} alt={label} className="w-full object-contain" />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
                          <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">⤢ View full plan</span>
                        </span>
                      </button>
                      <figcaption className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="truncate text-sm font-medium text-slate-700">{label}</span>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                          {m.kind === 'MASTER_PLAN' ? 'Master plan' : 'Floor plan'}
                        </span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          )}

          {(amenityTags.amenities?.length || amenityTags.propertyFeatures?.length || amenityTags.buildingFeatures?.length || amenityTags.otherFeatures?.length || d.locationAdvantages?.length) ? (
            <section className="space-y-5">
              <h2 className="text-base font-semibold">Amenities &amp; features</h2>
              <ChipGroup title="Amenities" items={amenityTags.amenities} />
              <ChipGroup title="Property features" items={amenityTags.propertyFeatures} />
              <ChipGroup title="Building features" items={amenityTags.buildingFeatures} />
              <ChipGroup title="Other features" items={amenityTags.otherFeatures} />
              <ChipGroup title="Location advantages" items={d.locationAdvantages} />
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 text-base font-semibold">Location</h2>
            {lat && lng ? (
              <>
                <MapView single expandable center={{ lat, lng }} pins={[{ ...p, name: title, lat, lng }]} height={360} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Icon.pin className="shrink-0 text-slate-400" /> {location || '—'}
                  </p>
                  <div className="flex gap-2">
                    <a href={mapsDirectionsUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700">
                      <Icon.directions /> Get directions
                    </a>
                    <a href={mapsSearchUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700">
                      Open in Google Maps <Icon.external />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                No exact map location set for this listing.
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          {isSoldOut && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800">
              <span className="inline-block font-extrabold uppercase tracking-wide text-rose-700 mb-1">Notice: Sold Out</span>
              <p>This unit is fully booked/sold out. You can still register an enquiry to get notified if new stock opens up.</p>
            </div>
          )}
          <EnquiryForm projectId={p.projectId} propertyId={p.id} />
        </aside>
      </div>

      <ImageLightbox src={lightbox?.src} alt={lightbox?.alt} onClose={() => setLightbox(null)} />
    </div>
  );
}
