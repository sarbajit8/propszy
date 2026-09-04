const { z } = require('zod');

const optNum = z.coerce.number().optional();

const commissionScheme = z
  .object({
    enabled: z.coerce.boolean().default(false),
    poolType: z.enum(['PERCENT', 'FLAT']).default('PERCENT'),
    poolValue: z.coerce.number().nonnegative().default(0),
    levels: z
      .array(z.object({ level: z.coerce.number().int().min(1).max(20), percent: z.coerce.number().min(0).max(100) }))
      .max(20)
      .default([]),
  })
  .nullable()
  .optional();

const base = {
  commissionScheme,
  projectId: z.string().min(1),
  unitType: z.string().min(1).max(120),
  categoryId: z.preprocess((v) => (v === '' ? null : v), z.string().nullable().optional()),
  carpetArea: optNum,
  builtUpArea: optNum,
  areaUnit: z.string().max(12).optional(),
  price: optNum,
  floor: z.string().max(40).optional(),
  facing: z.string().max(40).optional(),
  bedrooms: z.coerce.number().int().optional(),
  bathrooms: z.coerce.number().int().optional(),
  status: z.enum(['AVAILABLE', 'SOLD', 'ON_HOLD']).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
  isBestSeller: z.coerce.boolean().optional(),
  soldCount: z.coerce.number().int().min(0).optional(),
  latOverride: optNum,
  lngOverride: optNum,
  addressOverride: z.string().max(500).optional(),
};

const createSchema = { body: z.object(base) };
const updateSchema = { body: z.object(base).partial().omit({ projectId: true }) };

const listQuerySchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    projectId: z.string().optional(),
    status: z.string().optional(),
    unitType: z.string().optional(),
    priceMin: z.string().optional(),
    priceMax: z.string().optional(),
    bedrooms: z.string().optional(),
    facing: z.string().optional(),
    areaMin: z.string().optional(),
    areaMax: z.string().optional(),
    city: z.string().optional(),
    featured: z.string().optional(),
    trending: z.string().optional(),
    bestSeller: z.string().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'area_desc']).optional(),
  }),
};

module.exports = { createSchema, updateSchema, listQuerySchema };
