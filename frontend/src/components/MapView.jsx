import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, MarkerClustererF, InfoWindowF } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { priceRange } from '../lib/format';
import { usePublicConfig } from '../lib/publicConfig';
import { GMAPS_LOADER } from '../lib/gmaps';
import { LocalErrorBoundary } from './ErrorBoundary';

const isNum = (v) => v != null && v !== '' && !Number.isNaN(Number(v)) && Number.isFinite(Number(v));

const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const containerStyle = { width: '100%', height: '100%' };

// light, decluttered basemap
const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

function NoKeyFallback({ pins, height }) {
  return (
    <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 p-8 text-center" style={{ minHeight: height || 360 }}>
      <div>
        <p className="font-medium">Map preview unavailable</p>
        <p className="mt-1 text-sm text-slate-500">
          Add a <b>Google Maps API key</b> in <Link to="/admin/settings" className="text-brand-700 underline">Admin → Settings</Link> to enable the interactive map.
        </p>
        {pins?.length > 0 && (
          <ul className="mt-4 space-y-1 text-left text-sm">
            {pins.slice(0, 8).map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.slug || p.id}`} className="text-brand-700 hover:underline">{p.name}</Link>
                <span className="text-slate-400"> — {p.city}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LoadedMap({ apiKey, pins, center, zoom, height, single, activeId, onSelect, panTo }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, ...GMAPS_LOADER });
  const mapRef = useRef(null);
  const [active, setActive] = useState(null);

  const withCoords = useMemo(
    () =>
      pins
        .filter((p) => isNum(p.lat) && isNum(p.lng))
        .map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })),
    [pins]
  );

  const resolvedCenter = useMemo(() => {
    if (center && isNum(center.lat) && isNum(center.lng)) {
      return { lat: Number(center.lat), lng: Number(center.lng) };
    }
    if (withCoords.length) return { lat: withCoords[0].lat, lng: withCoords[0].lng };
    return { lat: 22.5726, lng: 88.3639 }; // West Bengal / Kolkata default
  }, [center, withCoords]);

  // fit bounds to all pins on first load / when the set changes
  useEffect(() => {
    if (!mapRef.current || single || withCoords.length < 2) return;
    const b = new window.google.maps.LatLngBounds();
    withCoords.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(b, 64);
  }, [withCoords, single]);

  // auto resize when map is mounted or height changes
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(mapRef.current, 'resize');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [height]);

  // external highlight → open info window (no auto-pan on hover)
  useEffect(() => {
    if (!activeId) { setActive(null); return; }
    const p = withCoords.find((x) => x.id === activeId);
    if (p) setActive(p);
  }, [activeId, withCoords]);

  // explicit focus (card click) → pan
  useEffect(() => {
    if (panTo && isNum(panTo.lat) && isNum(panTo.lng)) {
      const lat = Number(panTo.lat);
      const lng = Number(panTo.lng);
      mapRef.current?.panTo({ lat, lng });
      if ((mapRef.current?.getZoom() || 0) < 13) mapRef.current?.setZoom(13);
    }
  }, [panTo]);

  if (loadError) {
    return (
      <div className="grid place-items-center rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800" style={{ minHeight: height }}>
        <p>The map couldn’t load. Check that the Google Maps API key has <b>Maps JavaScript API</b> enabled and that this site is an allowed referrer.</p>
      </div>
    );
  }
  if (!isLoaded) return <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50" style={{ height }}>Loading map…</div>;

  const g = window.google.maps;
  const icon = (on) => ({
    path: g.SymbolPath.CIRCLE,
    scale: on ? 12 : 7,
    fillColor: on ? '#6d28d9' : '#a78bfa',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: on ? 3 : 2,
  });

  const pick = (p) => { setActive(p); onSelect?.(p); };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <LocalErrorBoundary fallback={
        <div className="grid place-items-center bg-slate-50 p-6 text-center text-sm text-slate-500" style={{ height }}>
          The map couldn’t be displayed right now.
        </div>
      }>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={resolvedCenter}
          zoom={single ? 15 : zoom}
          onLoad={(m) => {
            mapRef.current = m;
            if (window.google?.maps?.event) {
              window.google.maps.event.trigger(m, 'resize');
            }
          }}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            styles: MAP_STYLES,
          }}
        >
          {single ? (
            resolvedCenter && <MarkerF position={resolvedCenter} />
          ) : (
            <MarkerClustererF key={withCoords.map((p) => p.id).join(',')} averageCenter zoomOnClick>
              {(clusterer) =>
                withCoords.map((p) => (
                  <MarkerF
                    key={p.id}
                    position={{ lat: p.lat, lng: p.lng }}
                    clusterer={clusterer}
                    icon={icon(p.id === activeId)}
                    zIndex={p.id === activeId ? 999 : undefined}
                    onClick={() => pick(p)}
                  />
                ))
              }
            </MarkerClustererF>
          )}

          {active && isNum(active.lat) && isNum(active.lng) && (
            <InfoWindowF position={{ lat: active.lat, lng: active.lng }} onCloseClick={() => { setActive(null); onSelect?.(null); }}>
              <div className="w-[220px]">
                {(active.coverImageUrl || active.media?.[0]?.url) && (
                  <img src={active.coverImageUrl || active.media[0].url} alt="" className="mb-2 h-24 w-full rounded object-cover" />
                )}
                <p className="text-sm font-semibold text-slate-900">{active.name}</p>
                <p className="text-xs text-slate-500">{[active.address, active.city].filter(Boolean).join(', ')}</p>
                <p className="mt-1 text-xs font-medium">{priceRange(active.priceMin, active.priceMax)}</p>
                <Link to={`/projects/${active.slug || active.id}`} className="mt-1 block text-xs font-medium text-brand-700 hover:underline">
                  View project →
                </Link>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </LocalErrorBoundary>
    </div>
  );
}

export default function MapView({ pins = [], center, zoom, height = 420, single, activeId, onSelect, panTo, expandable = false }) {
  const { data: cfg, isLoading } = usePublicConfig();
  const apiKey = cfg?.googleMapsApiKey || ENV_KEY;
  const [expanded, setExpanded] = useState(false);

  const fallbackCenter = useMemo(() => {
    if (center && isNum(center.lat) && isNum(center.lng)) {
      return { lat: Number(center.lat), lng: Number(center.lng) };
    }
    if (cfg?.defaultLat && cfg?.defaultLng) {
      return { lat: Number(cfg.defaultLat), lng: Number(cfg.defaultLng) };
    }
    return { lat: 22.5726, lng: 88.3639 }; // West Bengal / Kolkata
  }, [center, cfg]);

  const effectiveZoom = zoom || (cfg?.defaultZoom ? Number(cfg.defaultZoom) : 11);

  if (isLoading && !ENV_KEY) {
    return <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50" style={{ height }}>Loading map…</div>;
  }
  if (!apiKey) return <NoKeyFallback pins={pins} height={height} />;

  const map = (
    <LoadedMap
      apiKey={apiKey}
      pins={pins}
      center={fallbackCenter}
      zoom={effectiveZoom}
      height={height}
      single={single}
      activeId={activeId}
      onSelect={onSelect}
      panTo={panTo}
    />
  );

  if (!expandable) return map;

  return (
    <>
      <div className="group relative cursor-zoom-in" onClick={() => setExpanded(true)}>
        <div className="pointer-events-none">{map}</div>
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/0 transition group-hover:bg-black/10" />
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
          ⤢ Click to view full map
        </span>
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 sm:p-6" onClick={() => setExpanded(false)}>
          <div className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpanded(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 shadow-md hover:bg-slate-50"
            >
              ✕
            </button>
            <LoadedMap
              apiKey={apiKey}
              pins={pins}
              center={center}
              zoom={zoom}
              height="100%"
              single={single}
              activeId={activeId}
              onSelect={onSelect}
              panTo={panTo}
            />
          </div>
        </div>
      )}
    </>
  );
}
