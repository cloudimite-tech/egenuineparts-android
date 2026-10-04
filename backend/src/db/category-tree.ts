// The Genuine Parts.lk category tree. Order here is the order shown in the app.
// `icon` on a parent is the key the mobile app maps to a glyph.
export interface CategoryDef {
  name: string;
  slug: string;
  icon: string;
  children: { name: string; slug: string }[];
}

export const CATEGORY_TREE: CategoryDef[] = [
  {
    name: 'Filters', slug: 'filters', icon: 'filters',
    children: [
      { name: 'Air Filters', slug: 'air-filters' },
      { name: 'Fuel Filters', slug: 'fuel-filters' },
      { name: 'Cabin Filters', slug: 'cabin-filters' },
      { name: 'Oil Filters', slug: 'oil-filters' },
    ],
  },
  {
    name: 'Electric Parts', slug: 'electric-parts', icon: 'electric',
    children: [
      { name: 'Horn', slug: 'horn' },
      { name: 'Ignition Coil', slug: 'ignition-coil' },
      { name: 'Spark Plug', slug: 'spark-plug' },
      { name: 'Bulb', slug: 'bulb' },
    ],
  },
  {
    name: 'Brake & Suspension Parts', slug: 'brake-suspension-parts', icon: 'brake-suspension',
    children: [
      { name: 'Brake Fluid', slug: 'brake-fluid' },
      { name: 'Brake Pad', slug: 'brake-pad' },
      { name: 'Engine Mounts', slug: 'engine-mounts' },
      { name: 'Stabilizer Link', slug: 'stabilizer-link' },
      { name: 'Bush', slug: 'bush' },
      { name: 'Caliper Piston', slug: 'caliper-piston' },
      { name: 'Caliper Repair Kits', slug: 'caliper-repair-kits' },
      { name: 'Shock Mount', slug: 'shock-mount' },
      { name: 'Dampers', slug: 'dampers' },
    ],
  },
  {
    name: 'Gear Box Parts', slug: 'gear-box-parts', icon: 'gearbox',
    children: [
      { name: 'Clutch Repair Kits', slug: 'clutch-repair-kits' },
      { name: 'Clutch Plate', slug: 'clutch-plate' },
      { name: 'Pressure Plate', slug: 'pressure-plate' },
    ],
  },
  {
    name: 'Motor Vehicle Accessories', slug: 'motor-vehicle-accessories', icon: 'accessories',
    children: [
      { name: 'Air Fresheners', slug: 'air-fresheners' },
      { name: 'Wiper Blades', slug: 'wiper-blades' },
      { name: 'VIP Lights', slug: 'vip-lights' },
    ],
  },
  {
    name: 'Lubricants & Coolants', slug: 'lubricants-coolants', icon: 'lubricants',
    children: [
      { name: 'Gear Box Oil', slug: 'gear-box-oil' },
      { name: 'Engine Oil', slug: 'engine-oil' },
      { name: 'Coolant', slug: 'coolant' },
    ],
  },
  {
    name: 'Bearings', slug: 'bearings', icon: 'bearings',
    children: [
      { name: 'Hub Bearings', slug: 'hub-bearings' },
      { name: 'Clutch Bearings', slug: 'clutch-bearings' },
    ],
  },
  {
    name: 'Engine Parts', slug: 'engine-parts', icon: 'engine',
    children: [
      { name: 'Tappet Cover', slug: 'tappet-cover' },
      { name: 'Water Pump', slug: 'water-pump' },
      { name: 'Fuel Pump', slug: 'fuel-pump' },
      { name: 'Tensioner Pulley & Adjusters', slug: 'tensioner-pulley-adjusters' },
    ],
  },
  {
    name: 'Engine Belts', slug: 'engine-belts', icon: 'belts',
    children: [
      { name: 'Alternator Belts', slug: 'alternator-belts' },
      { name: 'Fan Belts', slug: 'fan-belts' },
      { name: 'AC Belt', slug: 'ac-belt' },
    ],
  },
];

export const CATEGORY_ORDER = CATEGORY_TREE.map((c) => c.slug);

// Where products in the previous category tree should move to.
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  // old parents
  brakes: 'brake-suspension-parts',
  suspension: 'brake-suspension-parts',
  'oils-fluids': 'lubricants-coolants',
  engine: 'engine-parts',
  electrical: 'electric-parts',
  lighting: 'electric-parts',
  // old children
  'brake-pads': 'brake-pad',
  'brake-discs-rotors': 'brake-suspension-parts',
  'brake-calipers': 'caliper-repair-kits',
  'brake-lines-hoses': 'brake-suspension-parts',
  'gear-oil': 'gear-box-oil',
  atf: 'gear-box-oil',
  'spark-plugs': 'spark-plug',
  'timing-belts-chains': 'engine-belts',
  'gaskets-seals': 'engine-parts',
  'belts-pulleys': 'tensioner-pulley-adjusters',
  'shock-absorbers': 'dampers',
  struts: 'dampers',
  'control-arms': 'brake-suspension-parts',
  bushings: 'bush',
  'coil-springs': 'brake-suspension-parts',
  'cabin-ac-filters': 'cabin-filters',
  batteries: 'electric-parts',
  alternators: 'electric-parts',
  'starter-motors': 'electric-parts',
  sensors: 'electric-parts',
  'wiring-fuses': 'electric-parts',
  'headlight-bulbs': 'bulb',
  'tail-lights': 'bulb',
  'fog-lights': 'bulb',
  'indicator-bulbs': 'bulb',
};
