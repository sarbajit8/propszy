import { useCallback, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import toast from 'react-hot-toast';
import { usePublicConfig } from '../lib/publicConfig';
import { GMAPS_LOADER, parseAddressComponents } from '../lib/gmaps';

const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const INDIA = { lat: 20.5937, lng: 78.9629 };

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

  const marker = useMemo(() => {
    if (value?.lat && value?.lng) return { lat: Number(value.lat), lng: Number(value.lng) };
    return null;
  }, [value]);
  const center = marker || fallbackCenter || INDIA;

  const geocoder = () => new window.google.maps.Geocoder();

  const applyResult = (r, fallbackLatLng) => {
    if (r) {
      const loc = r.geometry.location;
      const lat = loc.lat();
      const lng = loc.lng();
      mapRef.current?.panTo({ lat, lng });
      if ((mapRef.current?.getZoom() || 0) < 14) mapRef.current?.setZoom(15);
      onPick({ lat, lng, address: r.formatted_address, ...parseAddressComponents(r.address_components) });
    } else if (fallbackLatLng) {
      onPick(fallbackLatLng); // keep the coords even if we couldn't name the place
    }
  };

  const searchAddress = useCallback(() => {
    const q = query.trim();
    if (!q || !window.google?.maps) return;
    setBusy(true);
    geocoder().geocode({ address: q, componentRestrictions: { country: 'IN' } }, (results, status) => {
      setBusy(false);
      if (status === 'OK' && results?.[0]) applyResult(results[0]);
      else toast.error("Couldn't find that place. Try a nearby landmark, or click the map.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pickAt = useCallback((lat, lng) => {
    if (!window.google?.maps) return;
    setBusy(true);
    geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      setBusy(false);
      applyResult(status === 'OK' ? results?.[0] : null, { lat, lng });
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
        <input
          className="input"
          placeholder="Type a locality or address, then Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } }}
        />
        <button type="button" className="btn-outline shrink-0" onClick={searchAddress} disabled={busy}>
          {busy ? '…' : 'Search'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={marker ? 15 : 5}
          onLoad={(m) => { mapRef.current = m; }}
          onClick={(e) => pickAt(e.latLng.lat(), e.latLng.lng())}
          options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false }}
        >
          {marker && <MarkerF position={marker} draggable onDragEnd={(e) => pickAt(e.latLng.lat(), e.latLng.lng())} />}
        </GoogleMap>
      </div>
      <p className="text-xs text-slate-400">
        {busy ? 'Looking that up…' : 'Search an address, or click the map / drag the pin to set the exact spot.'}
      </p>
    </div>
  );
}
