import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

export { mapboxgl, MAPBOX_ACCESS_TOKEN };

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ReverseGeocodeResult {
  placeName: string;
  address: string;
  street: string;
  area: string;
  city: string;
  state: string;
  country: string;
}

export async function reverseGeocode(
  lng: number,
  lat: number
): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=address,neighborhood,locality,place,region,country&limit=1`
    );
    const data = await res.json();
    if (!data.features || !data.features.length) {
      return {
        placeName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        street: '',
        area: '',
        city: '',
        state: '',
        country: '',
      };
    }
    const feat = data.features[0];
    const ctx = feat.context || [];
    const getCtx = (prefix: string) => {
      const c = ctx.find((x: any) => x.id && x.id.startsWith(prefix));
      return c ? c.text : '';
    };
    return {
      placeName: feat.place_name,
      address: feat.place_name,
      street: feat.text || feat.place_name.split(',')[0] || '',
      area: getCtx('neighborhood') || getCtx('locality'),
      city: getCtx('place'),
      state: getCtx('region'),
      country: getCtx('country'),
    };
  } catch {
    return {
      placeName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      street: '',
      area: '',
      city: '',
      state: '',
      country: '',
    };
  }
}

export interface DirectionsResult {
  route: GeoJSON.Feature;
  distance: number;
  duration: number;
  coordinates: [number, number][];
}

export async function getDirections(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<DirectionsResult | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
    );
    const data = await res.json();
    if (!data.routes || !data.routes[0]) return null;
    const r = data.routes[0];
    return {
      route: {
        type: 'Feature',
        geometry: r.geometry,
        properties: {},
      },
      distance: r.distance / 1000,
      duration: r.duration,
      coordinates: r.geometry.coordinates,
    };
  } catch {
    return null;
  }
}

export interface POIFeature {
  text: string;
  placeName: string;
  lng: number;
  lat: number;
  distance: number;
  address: string;
}

export async function searchNearbyPOI(
  lat: number,
  lng: number,
  type: string,
  limit: number = 15
): Promise<POIFeature[]> {
  try {
    const bbox = `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(type)}.json?proximity=${lng},${lat}&bbox=${bbox}&access_token=${MAPBOX_ACCESS_TOKEN}&limit=${limit}&types=poi`
    );
    const data = await res.json();
    if (!data.features) return [];
    return data.features.map((f: any) => {
      const dist = haversineDistance(lat, lng, f.center[1], f.center[0]);
      return {
        text: f.text,
        placeName: f.place_name,
        lng: f.center[0],
        lat: f.center[1],
        distance: dist,
        address: f.properties?.address || '',
      };
    });
  } catch {
    return [];
  }
}

export async function forwardGeocode(query: string): Promise<
  { text: string; placeName: string; lng: number; lat: number }[]
> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`
    );
    const data = await res.json();
    if (!data.features) return [];
    return data.features.map((f: any) => ({
      text: f.text,
      placeName: f.place_name,
      lng: f.center[0],
      lat: f.center[1],
    }));
  } catch {
    return [];
  }
}

export function pointToCircle(
  center: [number, number],
  radiusKm: number,
  points: number = 64
): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const earthRadius = 6371;
  const lat = (center[1] * Math.PI) / 180;
  const lng = (center[0] * Math.PI) / 180;
  const d = radiusKm / earthRadius;

  for (let i = 0; i <= points; i++) {
    const brng = (2 * Math.PI * i) / points;
    const lat2 = Math.asin(
      Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(brng)
    );
    const lng2 =
      lng +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat),
        Math.cos(d) - Math.sin(lat) * Math.sin(lat2)
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}
