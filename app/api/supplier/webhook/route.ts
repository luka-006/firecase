import { after } from 'next/server'
import { SupplierError } from '@/lib/supplier/client'
import { applySupplierWebhook, notifyShippedOrders } from '@/lib/supplier/fulfill'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const raw = await req.text()
  const sign = req.headers.get('sign') ?? ''
  try {
    const shipped = await applySupplierWebhook(raw, sign)
    if (shipped.length) {
      after(async () => {
        try {
          await notifyShippedOrders(shipped)
        } catch (err) {
          console.error('[supplier] webhook mail', (err as Error).message)
        }
      })
    }
  } catch (e) {
    if (e instanceof SupplierError && e.code === 401) return new Response('Unauthorized', { status: 401 })
    console.error('[supplier] webhook', (e as Error).message)
    return new Response('Error', { status: 500 })
  }
  return Response.json({ code: 200, result: true, message: 'ok' })
}
