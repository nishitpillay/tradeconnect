export type FeaturedCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  short: string;
  detail: string;
};

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    id: 'a0000001-0000-4000-a000-000000000001',
    slug: 'plumbing',
    name: 'Plumbing',
    icon: 'P',
    short: 'Leaks, drains, hot water, taps, toilets, and full plumbing installs.',
    detail:
      'Plumbing jobs cover everything from urgent leaks to planned installations, including drains, burst pipes, taps, toilets, kitchens, bathrooms, and hot water systems.',
  },
  {
    id: 'a0000002-0000-4000-a000-000000000002',
    slug: 'electrical',
    name: 'Electrical',
    icon: 'E',
    short: 'Lighting, wiring, switchboards, power points, appliances, and fault repairs.',
    detail:
      'Electrical services include repairs, upgrades, and new installations such as lighting, switchboards, power points, rewiring, smoke alarms, and fault finding.',
  },
  {
    id: 'a0000003-0000-4000-a000-000000000003',
    slug: 'carpentry',
    name: 'Carpentry',
    icon: 'C',
    short: 'Framing, decking, doors, cabinetry, shelving, and timber repairs.',
    detail:
      'Carpentry covers structural timber work and finish work, including doors, decks, pergolas, shelving, cabinetry, framing, and general wood repairs.',
  },
  {
    id: 'a0000004-0000-4000-a000-000000000004',
    slug: 'painting',
    name: 'Painting',
    icon: 'Pt',
    short: 'Interior walls, exterior surfaces, prep work, coatings, and touch-ups.',
    detail:
      'Painting services improve appearance and durability across interiors and exteriors, from full repaints and trim work to prep, coatings, and touch-ups.',
  },
  {
    id: 'a0000005-0000-4000-a000-000000000005',
    slug: 'landscaping',
    name: 'Landscaping',
    icon: 'L',
    short: 'Paving, turf, planting, retaining walls, irrigation, and garden upgrades.',
    detail:
      'Landscaping covers outdoor improvement work such as paving, turf laying, planting, garden design, retaining walls, irrigation, and yard upgrades.',
  },
  {
    id: 'a0000009-0000-4000-a000-000000000009',
    slug: 'roofing',
    name: 'Roofing',
    icon: 'R',
    short: 'Roof repairs, replacement, guttering, storm damage, and leak detection.',
    detail:
      'Roofing includes maintenance, restoration, repairs, guttering, flashing, inspections, and storm damage work for homes and commercial properties.',
  },
  {
    id: 'a0000008-0000-4000-a000-000000000008',
    slug: 'tiling',
    name: 'Tiling',
    icon: 'T',
    short: 'Bathrooms, kitchens, floors, splashbacks, grout, and waterproofing.',
    detail:
      'Tiling work includes bathrooms, floors, walls, splashbacks, outdoor areas, grout renewal, waterproofing, and tile replacement.',
  },
  {
    id: 'a0000010-0000-4000-a000-000000000010',
    slug: 'demolition',
    name: 'Demolition',
    icon: 'D',
    short: 'Strip-outs, wall removal, flooring demolition, sheds, and site clearing.',
    detail:
      'Demolition is for safe removal and site preparation before renovation or rebuilding, including kitchens, bathrooms, walls, flooring, sheds, and cleanup.',
  },
];

export function getFeaturedCategoryById(categoryId?: string | null): FeaturedCategory | undefined {
  return FEATURED_CATEGORIES.find((category) => category.id === categoryId);
}
