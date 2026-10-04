import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { isAdmin } from '@/lib/auth'

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody
  try {
    const res = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!(await isAdmin())) throw new Error('Unauthorized')
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {},
    })
    return Response.json(res)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
