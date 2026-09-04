import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, MarkerClustererF, InfoWindowF } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { priceRange } from '../lib/format';
import { usePublicConfig } from '../lib/publicConfig';
import { GMAPS_LOADER } from '../lib/gmaps';

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

  const withCoords = useMemo(() => pins.filter((p) => p.lat && p.lng), [pins]);

  const resolvedCenter = useMemo(() => {
    if (center) return center;
    if (withCoords.length) return { lat: withCoords[0].lat, lng: withCoords[0].lng };
    return { lat: 20.5937, lng: 78.9629 };
  }, [center, withCoords]);

  // fit bounds to all pins on first load / when the set changes
  useEffect(() => {
    if (!mapRef.current || single || withCoords.length < 2) return;
    const b = new window.google.maps.LatLngBounds();
    withCoords.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(b, 64);
  }, [withCoords, single]);

  // external highlight → open info window (no auto-pan on hover)
  useEffect(() => {
    if (!activeId) { setActive(null); return; }
    const p = pins.find((x) => x.id === activeId);
    if (p && p.lat && p.lng) setActive(p);
  }, [activeId, pins]);

  // explicit focus (card click) → pan
  useEffect(() => {
    if (panTo && panTo.lat && panTo.lng) {
      mapRef.current?.panTo({ lat: panTo.lat, lng: panTo.lng });
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
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={resolvedCenter}
        zoom={single ? 15 : zoom}
        onLoad={(m) => { mapRef.current = m; }}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          styles: MAP_STYLES,
        }}
      >
        {single ? (
          <MarkerF position={resolvedCenter} />
        ) : (
          <MarkerClustererF averageCenter zoomOnClick>
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

        {active && active.lat && active.lng && (
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
    </div>
  );
}

export default function MapView({ pins = [], center, zoom = 11, height = 420, single, activeId, onSelect, panTo }) {
  const { data: cfg, isLoading } = usePublicConfig();
  const apiKey = cfg?.googleMapsApiKey || ENV_KEY;

  if (isLoading && !ENV_KEY) {
    return <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50" style={{ height }}>Loading map…</div>;
  }
  if (!apiKey) return <NoKeyFallback pins={pins} height={height} />;

  return (
    <LoadedMap
      apiKey={apiKey}
      pins={pins}
      center={center}
      zoom={zoom}
      height={height}
      single={single}
      activeId={activeId}
      onSelect={onSelect}
      panTo={panTo}
    />
  );
}
