/**
 * Seed 01: Job Categories
 *
 * Inserts the trade service taxonomy into job_categories.
 * All IDs are fixed UUIDs for deterministic cross-environment references.
 *
 * Run: npx ts-node db/seeds/run.ts
 * Or via: npm run db:seed
 */

import { PoolClient } from 'pg';

// ─── Fixed category UUIDs ─────────────────────────────────────────────────────

export const CATEGORY_IDS = {
  PLUMBING:     'a0000001-0000-4000-a000-000000000001',
  ELECTRICAL:   'a0000002-0000-4000-a000-000000000002',
  CARPENTRY:    'a0000003-0000-4000-a000-000000000003',
  PAINTING:     'a0000004-0000-4000-a000-000000000004',
  LANDSCAPING:  'a0000005-0000-4000-a000-000000000005',
  CLEANING:     'a0000006-0000-4000-a000-000000000006',
  HVAC:         'a0000007-0000-4000-a000-000000000007',
  TILING:       'a0000008-0000-4000-a000-000000000008',
  ROOFING:      'a0000009-0000-4000-a000-000000000009',
  PEST_CONTROL: 'a000000a-0000-4000-a000-00000000000a',
  LOCKSMITH:    'a000000b-0000-4000-a000-00000000000b',
  MOVING:       'a000000c-0000-4000-a000-00000000000c',
  CONCRETING:   'a000000d-0000-4000-a000-00000000000d',
  FENCING:      'a000000e-0000-4000-a000-00000000000e',
  HANDYMAN:     'a000000f-0000-4000-a000-00000000000f',
} as const;

// ─── Category definitions ─────────────────────────────────────────────────────

interface CategoryRow {
  id:          string;
  name:        string;
  slug:        string;
  parent_id:   string | null;
  icon_name:   string | null;
  description: string;
  is_active:   boolean;
  sort_order:  number;
}

const CATEGORIES: CategoryRow[] = [
  {
    id: CATEGORY_IDS.PLUMBING, name: 'Plumbing', slug: 'plumbing',
    parent_id: null, icon_name: 'wrench',
    description: 'Hot water systems, pipe repairs, drain clearing, and bathroom plumbing.',
    is_active: true, sort_order: 1,
  },
  {
    id: CATEGORY_IDS.ELECTRICAL, name: 'Electrical', slug: 'electrical',
    parent_id: null, icon_name: 'zap',
    description: 'Electrical installations, repairs, switchboard upgrades, safety inspections.',
    is_active: true, sort_order: 2,
  },
  {
    id: CATEGORY_IDS.CARPENTRY, name: 'Carpentry & Joinery', slug: 'carpentry',
    parent_id: null, icon_name: 'hammer',
    description: 'Custom furniture, decking, pergolas, doors, windows, and structural timber work.',
    is_active: true, sort_order: 3,
  },
  {
    id: CATEGORY_IDS.PAINTING, name: 'Painting & Decorating', slug: 'painting',
    parent_id: null, icon_name: 'paintbrush',
    description: 'Interior and exterior painting, wallpaper, feature walls, and colour consulting.',
    is_active: true, sort_order: 4,
  },
  {
    id: CATEGORY_IDS.LANDSCAPING, name: 'Landscaping & Gardening', slug: 'landscaping',
    parent_id: null, icon_name: 'tree',
    description: 'Garden design, lawn care, irrigation, retaining walls, and outdoor living.',
    is_active: true, sort_order: 5,
  },
  {
    id: CATEGORY_IDS.CLEANING, name: 'Cleaning', slug: 'cleaning',
    parent_id: null, icon_name: 'sparkles',
    description: 'Residential, commercial, end-of-lease, carpet, and window cleaning.',
    is_active: true, sort_order: 6,
  },
  {
    id: CATEGORY_IDS.HVAC, name: 'Heating, Ventilation & Cooling', slug: 'hvac',
    parent_id: null, icon_name: 'thermometer',
    description: 'Air conditioning installation and servicing, ducted heating, split systems.',
    is_active: true, sort_order: 7,
  },
  {
    id: CATEGORY_IDS.TILING, name: 'Tiling', slug: 'tiling',
    parent_id: null, icon_name: 'grid',
    description: 'Floor and wall tiling, bathrooms, kitchens, outdoor areas, and pool surrounds.',
    is_active: true, sort_order: 8,
  },
  {
    id: CATEGORY_IDS.ROOFING, name: 'Roofing', slug: 'roofing',
    parent_id: null, icon_name: 'home',
    description: 'Roof repairs, replacements, gutter installation, and leak detection.',
    is_active: true, sort_order: 9,
  },
  {
    id: CATEGORY_IDS.PEST_CONTROL, name: 'Pest Control', slug: 'pest-control',
    parent_id: null, icon_name: 'bug',
    description: 'Termite inspections, rodent control, cockroach treatment, and preventive spraying.',
    is_active: true, sort_order: 10,
  },
  {
    id: CATEGORY_IDS.LOCKSMITH, name: 'Locksmith', slug: 'locksmith',
    parent_id: null, icon_name: 'key',
    description: 'Lock installation, rekeying, emergency lockouts, security upgrades.',
    is_active: true, sort_order: 11,
  },
  {
    id: CATEGORY_IDS.MOVING, name: 'Removalists & Moving', slug: 'moving',
    parent_id: null, icon_name: 'truck',
    description: 'Residential and commercial moves, packing, interstate and local relocations.',
    is_active: true, sort_order: 12,
  },
  {
    id: CATEGORY_IDS.CONCRETING, name: 'Concreting', slug: 'concreting',
    parent_id: null, icon_name: 'layers',
    description: 'Driveways, paths, slabs, resurfacing, exposed aggregate, and pool surrounds.',
    is_active: true, sort_order: 13,
  },
  {
    id: CATEGORY_IDS.FENCING, name: 'Fencing', slug: 'fencing',
    parent_id: null, icon_name: 'shield',
    description: 'Colorbond, timber, glass, pool fencing, and retaining walls.',
    is_active: true, sort_order: 14,
  },
  {
    id: CATEGORY_IDS.HANDYMAN, name: 'Handyman', slug: 'handyman',
    parent_id: null, icon_name: 'tool',
    description: 'General repairs, flat-pack assembly, small jobs, and property maintenance.',
    is_active: true, sort_order: 15,
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedCategories(client: PoolClient): Promise<void> {
  console.log('  -> Seeding job categories...');

  for (const cat of CATEGORIES) {
    await client.query(
      `INSERT INTO job_categories (id, name, slug, parent_id, icon_name, description, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name        = EXCLUDED.name,
         slug        = EXCLUDED.slug,
         icon_name   = EXCLUDED.icon_name,
         description = EXCLUDED.description,
         is_active   = EXCLUDED.is_active,
         sort_order  = EXCLUDED.sort_order`,
      [cat.id, cat.name, cat.slug, cat.parent_id, cat.icon_name, cat.description, cat.is_active, cat.sort_order]
    );
  }

  console.log(`  OK ${CATEGORIES.length} job categories seeded.`);
}

// ─── Standalone runner ────────────────────────────────────────────────────────

if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  pool.connect()
    .then(async (client: PoolClient) => {
      try {
        await client.query('BEGIN');
        await seedCategories(client);
        await client.query('COMMIT');
        console.log('\nCategories seed complete.\n');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nCategories seed failed:', err);
        process.exit(1);
      } finally {
        client.release();
        await pool.end();
      }
    })
    .catch((err: Error) => {
      console.error('DB connection failed:', err.message);
      process.exit(1);
    });
}
