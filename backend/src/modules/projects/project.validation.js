const { z } = require('zod');

const num = z.coerce.number();
const optNum = num.optional();

const baseProject = {
  name: z.string().min(2).max(200),
  description: z.string().max(20000).optional(),
  builder: z.string().max(200).optional(),
  developerId: z.preprocess((v) => (v === '' ? null : v), z.string().nullable().optional()),
  reraNo: z.string().max(100).optional(),
  type: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED']).optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'READY_TO_MOVE']).optional(),
  possessionDate: z.preprocess((v) => (v === '' || v == null ? undefined : new Date(v)), z.date().optional()),
  priceMin: optNum,
  priceMax: optNum,
  lat: optNum,
  lng: optNum,
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  pincode: z.string().max(12).optional(),
  coverImageUrl: z.string().url().optional(),
  masterPlanUrl: z.string().url().optional(),
  brochureUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),
  featuredVideoUrl: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(400).optional(),
  commissionBaseType: z.enum(['FLAT', 'PERCENT']).optional(),
  commissionBaseValue: optNum,
  isPublished: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
  isBestSeller: z.coerce.boolean().optional(),
  amenityIds: z.array(z.string()).optional(),
};

const createSchema = { body: z.object(baseProject) };
const updateSchema = { body: z.object(baseProject).partial() };

const listQuerySchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    q: z.string().optional(),
    city: z.string().optional(),      // comma-separated
    type: z.string().optional(),      // comma-separated
    status: z.string().optional(),    // comma-separated
    builder: z.string().optional(),
    reraNo: z.string().optional(),
    featured: z.string().optional(),
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
    bedrooms: z.string().optional(),  // comma-separated
    areaMin: z.string().optional(),
    areaMax: z.string().optional(),
    availableOnly: z.string().optional(),
    amenities: z.string().optional(), // comma-separated amenity ids
    sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name', 'popular']).optional(),
    published: z.string().optional(),
  }),
};

module.exports = { createSchema, updateSchema, listQuerySchema };
