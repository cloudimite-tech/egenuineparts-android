import { count } from 'drizzle-orm';
import { db } from '../db/client';
import { serviceTypes } from '../db/schema';

// The starting list. Admins can add, rename, reorder or hide types later.
export const DEFAULT_SERVICE_TYPES = [
  { name: 'Garages', icon: 'build-outline', description: 'General repairs, engine and suspension work' },
  { name: 'Service Station', icon: 'water-outline', description: 'Oil changes, washing, full and periodic services' },
  { name: 'Auto Electrical', icon: 'flash-outline', description: 'Wiring, batteries, starters, alternators and diagnostics' },
  { name: 'Auto AC Service', icon: 'snow-outline', description: 'A/C gas refills, repairs and cleaning' },
  { name: 'Vehicle Spare Part Service', icon: 'cog-outline', description: 'Fitting, sourcing and reconditioning parts' },
  { name: 'Modification', icon: 'color-wand-outline', description: 'Body kits, wraps, lighting, audio and performance' },
];

// Icons the admin can choose from (Ionicons names used by the app).
export const SERVICE_ICONS = [
  'build-outline', 'water-outline', 'flash-outline', 'snow-outline', 'cog-outline', 'color-wand-outline',
  'car-outline', 'car-sport-outline', 'construct-outline', 'hammer-outline', 'speedometer-outline', 'battery-charging-outline',
  'color-palette-outline', 'sparkles-outline', 'disc-outline', 'shield-checkmark-outline', 'navigate-outline', 'medkit-outline',
];

export function slugify(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'service';
}

let ensured = false;
/** First run on a fresh database: create the default list. */
export async function ensureDefaultServiceTypes() {
  if (ensured) return;
  const [{ n }] = await db.select({ n: count() }).from(serviceTypes);
  if (Number(n) === 0) {
    await db
      .insert(serviceTypes)
      .values(DEFAULT_SERVICE_TYPES.map((t, i) => ({ ...t, slug: slugify(t.name), sortOrder: i })))
      .onConflictDoNothing();
  }
  ensured = true;
}
