import { useCallback, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import toast from 'react-hot-toast';
import { usePublicConfig } from '../lib/publicConfig';
import { GMAPS_LOADER, parseAddressComponents } from '../lib/gmaps';
import { LocalErrorBoundary } from './ErrorBoundary';

const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const INDIA = { lat: 20.5937, lng: 78.9629 };

// Brand-violet teardrop pin, like Google's default marker but on-brand — inline SVG, no assets.
const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
    <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 29 17 29s17-16.3 17-29C34 7.6 26.4 0 17 0z" fill="#7c3aed"/>
    <circle cx="17" cy="17" r="7" fill="#fff"/>
  </svg>`,
);
const PIN_ICON = `data:image/svg+xml,${PIN_SVG}`;

/**
 * Interactive location picker. Type an address and press search, or click / drag
 * the pin. onPick receives { lat, lng, address?, city?, state?, pincode? } — only
 * the fields it could resolve; the parent merges non-empty values.
 * Uses core Maps JS + google.maps.Geocoder only (no Places library).
 */
export default function LocationPicker({ value, fallbackCenter, onPick, height = 300 }) {
  const { data: cfg } = usePublicConfig();
  const apiKey = cfg?.googleMapsApiKey || ENV_KEY;
  if (!apiKey) return null;
  return <Inner apiKey={apiKey} value={value} fallbackCenter={fallbackCenter} onPick={onPick} height={height} />;
}

function Inner({ apiKey, value, fallbackCenter, onPick, height }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, ...GMAPS_LOADER });
  const mapRef = useRef(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [place, setPlace] = useState(null); // { address, name? } for the current pin — shown as a place card
  const [showInfo, setShowInfo] = useState(false);
  const [apiBlocked, setApiBlocked] = useState(false); // Geocoding API not enabled on this key

  const marker = useMemo(() => {
    if (value?.lat && value?.lng) return { lat: Number(value.lat), lng: Number(value.lng) };
    return null;
  }, [value]);
  const center = marker || fallbackCenter || INDIA;

  const geocoder = () => new window.google.maps.Geocoder();

  const applyResult = (r, fallbackLatLng, { zoom = 16 } = {}) => {
    if (r) {
      const loc = r.geometry.location;
      const lat = loc.lat();
      const lng = loc.lng();
      mapRef.current?.panTo({ lat, lng });
      if ((mapRef.current?.getZoom() || 0) < zoom) mapRef.current?.setZoom(zoom);
      const name = r.address_components?.[0]?.long_name;
      setPlace({ address: r.formatted_address, name: name !== r.formatted_address ? name : undefined });
      setShowInfo(true);
      onPick({ lat, lng, address: r.formatted_address, ...parseAddressComponents(r.address_components) });
    } else if (fallbackLatLng) {
      setPlace(null);
      setShowInfo(false);
      onPick(fallbackLatLng); // keep the coords even if we couldn't name the place
    }
  };

  const describeStatus = (status) => {
    if (status === 'ZERO_RESULTS') return "No results — try a nearby landmark, or click the map directly.";
    if (status === 'REQUEST_DENIED') {
      setApiBlocked(true);
      return 'Address search isn’t enabled for this Maps key yet — click the map to drop a pin instead.';
    }
    if (status === 'OVER_QUERY_LIMIT') return 'Search limit reached for now — click the map to drop a pin instead.';
    return "Couldn't search right now. Try clicking the map instead.";
  };

  const searchAddress = useCallback(() => {
    const q = query.trim();
    if (!q || !window.google?.maps) return;
    setBusy(true);
    geocoder().geocode({ address: q, componentRestrictions: { country: 'IN' } }, (results, status) => {
      setBusy(false);
      if (status === 'OK' && results?.[0]) applyResult(results[0], null, { zoom: 16 });
      else toast.error(describeStatus(status));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pickAt = useCallback((lat, lng) => {
    if (!window.google?.maps) return;
    setBusy(true);
    geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      setBusy(false);
      if (status === 'OK' && results?.[0]) applyResult(results[0], { lat, lng }, { zoom: 17 });
      else applyResult(null, { lat, lng });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPick]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        The map couldn’t load. Check that the Google Maps API key in <b>Admin → Settings</b> is valid and has
        “Maps JavaScript API” enabled. You can still type the address and coordinates below.
      </div>
    );
  }
  if (!isLoaded) {
    return <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400" style={{ height }}>Loading map…</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            className="input pl-9"
            placeholder="Search a locality, landmark or full address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } }}
          />
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={searchAddress} disabled={busy || !query.trim()}>
          {busy ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
          ) : 'Search'}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
        <LocalErrorBoundary fallback={
          <div className="grid place-items-center bg-slate-50 p-6 text-center text-sm text-slate-500" style={{ height }}>
            The map couldn’t be displayed right now — you can still enter coordinates manually below.
          </div>
        }>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={marker ? 15 : 5}
            onLoad={(m) => { mapRef.current = m; }}
            onClick={(e) => { if (e.latLng) pickAt(e.latLng.lat(), e.latLng.lng()); }}
            options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false }}
          >
            {marker && (
              <MarkerF
                position={marker}
                draggable
                icon={{ url: PIN_ICON, scaledSize: new window.google.maps.Size(34, 46), anchor: new window.google.maps.Point(17, 46) }}
                animation={window.google.maps.Animation.DROP}
                onClick={() => setShowInfo((v) => !v)}
                onDragEnd={(e) => { if (e.latLng) pickAt(e.latLng.lat(), e.latLng.lng()); }}
              />
            )}
            {marker && showInfo && place && (
              <InfoWindowF position={marker} onCloseClick={() => setShowInfo(false)}>
                <div className="max-w-[220px] py-0.5">
                  {place.name && <p className="text-sm font-semibold text-slate-900">{place.name}</p>}
                  <p className="text-xs text-slate-600">{place.address}</p>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </LocalErrorBoundary>
      </div>

      {place?.address ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span><b>Location set:</b> {place.address}</span>
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          {busy ? 'Looking that up…' : 'Search an address, or click the map / drag the pin to set the exact spot.'}
        </p>
      )}
      {apiBlocked && (
        <p className="text-xs text-amber-600">
          Note: address search needs “Geocoding API” enabled for this Maps key in Google Cloud Console — clicking/dragging the pin still works.
        </p>
      )}
    </div>
  );
}
