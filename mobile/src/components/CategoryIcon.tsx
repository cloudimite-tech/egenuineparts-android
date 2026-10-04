import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type MciName = keyof typeof MaterialCommunityIcons.glyphMap;

const PARENT: Record<string, MciName> = {
  filters: 'air-filter',
  electric: 'car-battery',
  'brake-suspension': 'car-brake-abs',
  gearbox: 'car-shift-pattern',
  accessories: 'spray',
  lubricants: 'oil',
  bearings: 'circle-double',
  engine: 'engine',
  belts: 'car-turbocharger',
};

// Sub-categories get their own glyph where a good one exists.
const BY_SLUG: Record<string, MciName> = {
  'air-filters': 'air-filter',
  'fuel-filters': 'fuel',
  'cabin-filters': 'fan',
  'oil-filters': 'filter',
  horn: 'bullhorn',
  'ignition-coil': 'flash',
  'spark-plug': 'lightning-bolt',
  bulb: 'lightbulb-on',
  'brake-fluid': 'car-brake-fluid-level',
  'brake-pad': 'car-brake-alert',
  'engine-mounts': 'engine-outline',
  'stabilizer-link': 'link-variant',
  bush: 'circle-slice-8',
  'caliper-piston': 'car-brake-abs',
  'caliper-repair-kits': 'toolbox',
  'shock-mount': 'car-traction-control',
  dampers: 'car-esp',
  'clutch-repair-kits': 'tools',
  'clutch-plate': 'disc',
  'pressure-plate': 'car-clutch',
  'air-fresheners': 'spray',
  'wiper-blades': 'wiper',
  'vip-lights': 'car-light-dimmed',
  'gear-box-oil': 'car-shift-pattern',
  'engine-oil': 'oil',
  coolant: 'car-coolant-level',
  'hub-bearings': 'tire',
  'clutch-bearings': 'cog',
  'tappet-cover': 'car-cog',
  'water-pump': 'water-pump',
  'fuel-pump': 'gas-station',
  'tensioner-pulley-adjusters': 'car-turbocharger',
  'alternator-belts': 'current-ac',
  'fan-belts': 'fan',
  'ac-belt': 'snowflake',
};

export function categoryIconName(slug?: string | null, icon?: string | null): MciName {
  return (slug && BY_SLUG[slug]) || (icon && PARENT[icon]) || 'car-wrench';
}

export function CategoryIcon({
  slug,
  icon,
  size = 22,
  color,
}: {
  slug?: string | null;
  icon?: string | null;
  size?: number;
  color: string;
}) {
  return <MaterialCommunityIcons name={categoryIconName(slug, icon)} size={size} color={color} />;
}
