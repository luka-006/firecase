import { z } from 'zod'
import { SET_ITEM_MAX, SET_ITEM_MIN } from '../setovi'

const itemSchema = z.object({
  productId: z.number().int().positive().optional(),
  slug: z.string().min(1).max(120).optional(),
}).refine((item) => item.productId != null || !!item.slug?.trim(), { message: 'productId or slug is required' })

const imageSchema = z.string().min(8).max(2000).refine(
  (value) => value.startsWith('https://') || value.startsWith('http://'),
  { message: 'Image must be an http(s) URL' },
)

export const setProposalCreateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  nameHr: z.string().min(1).max(300).optional(),
  shortHr: z.string().min(1).max(500),
  items: z.array(itemSchema).min(SET_ITEM_MIN).max(SET_ITEM_MAX),
  images: z.array(imageSchema).min(1).max(12),
  priceCents: z.number().int().positive().max(10_000_000),
  freeShipping: z.boolean().optional(),
  sizeMix: z.string().max(500).optional(),
  notes: z.string().max(8000).optional(),
  status: z.enum(['draft', 'review']).optional(),
}).refine((body) => !!(body.name?.trim() || body.nameHr?.trim()), { message: 'name is required', path: ['name'] })
