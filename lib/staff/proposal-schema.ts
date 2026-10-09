import { z } from 'zod'
import { QUALITY_TAGS } from '../types'

const variantSchema = z.object({
  hr: z.string().max(200),
  en: z.string().max(200).optional(),
  sup: z.string().max(200).optional(),
})

export const proposalBodySchema = z.object({
  status: z.enum(['draft', 'review']).optional(),
  nameHr: z.string().min(1).max(300).optional(),
  nameEn: z.string().max(300).optional(),
  shortHr: z.string().max(500).optional(),
  shortEn: z.string().max(500).optional(),
  descHr: z.string().max(15000).optional(),
  descEn: z.string().max(15000).optional(),
  images: z.array(z.string().min(8).max(2000)).max(20).optional(),
  variants: z.array(variantSchema).max(30).optional(),
  supplierUrl: z.string().url().max(2000).optional().or(z.literal('')),
  costCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  estDeliveryHr: z.string().max(200).optional(),
  estDeliveryEn: z.string().max(200).optional(),
  weightDims: z.string().max(500).optional(),
  materialHr: z.string().max(500).optional(),
  materialEn: z.string().max(500).optional(),
  manufacturer: z.string().max(4000).optional(),
  euResponsible: z.string().max(4000).optional(),
  safetyHr: z.string().max(8000).optional(),
  safetyEn: z.string().max(8000).optional(),
  qualityTags: z.array(z.enum(QUALITY_TAGS)).max(QUALITY_TAGS.length).optional(),
  notes: z.string().max(8000).optional(),
  sources: z.string().max(8000).optional(),
})

export const proposalCreateSchema = proposalBodySchema.extend({
  nameHr: z.string().min(1).max(300),
})

export const proposalPatchSchema = proposalBodySchema.extend({
  id: z.number().int().positive(),
})
