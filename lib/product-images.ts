import { z } from 'zod'

/** Product photos must come from the shop's own Vercel Blob store, the same rule next.config uses for images. */
export function isShopImageUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/** Body for replacing the photos of an existing product. Extra fields are rejected so nothing else can change. */
export const productImagesSchema = z.strictObject({
  slug: z.string().trim().min(1).max(120),
  images: z.array(z.string().max(2000).refine(isShopImageUrl, { message: 'Image must be a Firecase Blob URL' })).min(1).max(20),
})
