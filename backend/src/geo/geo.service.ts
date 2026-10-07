import { Injectable } from '@nestjs/common';

// Address ↔ map lookups via OpenStreetMap Nominatim (free, no API key).
// Its usage policy asks for an identifying User-Agent, max ~1 request per
// second and caching — so the app always goes through this proxy.
const UA = 'GenuinePartsLK/1.0 (support@genuineparts.lk)';
const NOMINATIM = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

export interface Place {
  label: string;
  lat: number;
  lng: number;
}

const cache = new Map<string, { at: number; value: any }>();
const TTL = 24 * 60 * 60 * 1000;
let last = 0;

async function politeFetch(url: string) {
  const key = url;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const value = await res.json();
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

@Injectable()
export class GeoService {
  async search(q: string): Promise<Place[]> {
    const query = q.trim().replace(/\s+/g, ' ').slice(0, 200);
    if (query.length < 3) return [];
    try {
      const rows = await politeFetch(
        `${NOMINATIM}/search?format=jsonv2&countrycodes=lk&limit=5&addressdetails=0&q=${encodeURIComponent(query)}`,
      );
      return (rows as any[]).map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
    } catch {
      return []; // the app falls back to "drag the pin"
    }
  }

  async reverse(lat: number, lng: number) {
    try {
      const r = await politeFetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=16&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`);
      const a = r?.address ?? {};
      return {
        label: r?.display_name ?? null,
        road: a.road ?? null,
        city: a.city ?? a.town ?? a.village ?? a.suburb ?? null,
        district: (a.state_district ?? a.county ?? '').replace(/ District$/i, '') || null,
      };
    } catch {
      return { label: null, road: null, city: null, district: null };
    }
  }
}
