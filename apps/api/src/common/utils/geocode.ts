const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: { state?: string };
}

/**
 * Resolves an area name to coordinates, constrained to Karnataka, India —
 * lets Super Admin add an Area without having to look up lat/lng manually
 * (see master-data.service.ts geocodeArea). Backed by Nominatim
 * (OpenStreetMap's free geocoder, no API key) rather than a paid mapping
 * service — this app's volume is Super Admin occasionally adding areas,
 * not a live user-facing autocomplete, so Nominatim's usage policy (one
 * request at a time, a real User-Agent) is easily within bounds.
 *
 * Returns null — never a guessed location — when nothing in Karnataka
 * matches, including when Nominatim's best match resolves to a different
 * state (a generic area name like "Vijay Nagar" exists in multiple
 * states; silently accepting the wrong one would be worse than nothing).
 */
export async function geocodeAreaInKarnataka(name: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: `${name}, Karnataka, India`,
    format: "json",
    addressdetails: "1",
    countrycodes: "in",
    limit: "1",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "SRHomeTutors/1.0 (admin area lookup; see https://srhometutors.in)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return null;

  const results = (await res.json()) as NominatimResult[];
  const match = results[0];
  if (!match) return null;
  if (match.address?.state && match.address.state !== "Karnataka") return null;

  const latitude = Number(match.lat);
  const longitude = Number(match.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude, displayName: match.display_name };
}
