// Shared Google Maps JS loader options — every useJsApiLoader call in the app
// MUST pass the same object shape (same id + same libraries reference) or the
// loader throws "Loader must not be called again with different options".
// Core Maps JS only — no extra libraries (Places etc.) so a key that only has
// "Maps JavaScript API" enabled still loads. Geocoding uses google.maps.Geocoder.
export const GMAPS_LOADER = { id: 'gmaps' };

export function parseAddressComponents(components = []) {
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name;
  return {
    city: get('locality') || get('administrative_area_level_2') || get('administrative_area_level_3') || get('sublocality'),
    state: get('administrative_area_level_1'),
    pincode: get('postal_code'),
  };
}
