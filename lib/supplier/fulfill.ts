import 'server-only'
import { sql } from '../db'
import { sendShipped } from '../mail'
import { logShippedEmail } from '../mail/order-email-log'
import { getSettingsFresh } from '../settings'
import type { Order, OrderItem, Product, Variant } from '../types'
import { supplierDestination, supplierPhone } from './address'
import { isSupplierNotFound, SupplierError, supplierOpenId, supplierRequest } from './client'
import { safeSupplierMessage, shopOrderIdFromNumber, supplierId, supplierOrderNumber } from './ids'
import { pickLogistic, supplierShipped, supplierTrackingShipped, type FreightOption } from './logistic'
import { supplierWebhookSignOk } from './sign'

const REMARK = 'Dropshipping order. Please do not include an invoice, prices or promotional material in the package. Thank you!'

type Detail = {
  orderId?: string
  orderNum?: string
  cjOrderId?: string | null
  shipmentOrderId?: string
  orderStatus?: string
  logisticName?: string | null
}

type CreateResult = Detail & {
  orderNumber?: string
  logisticsMiss?: boolean
  interceptOrderReasons?: { message?: string }[]
}

type MappedLine = { vid: string; sku: string; qty: number; index: number }

function retryMinutes(attempts: number, message: string) {
  if (/nije postavljen/i.test(message)) return 24 * 60
  const steps = [15, 60, 360, 1440]
  return steps[Math.min(Math.max(attempts, 1), steps.length) - 1] ?? 1440
}

function variantMatch(variants: Variant[], name: string) {
  return variants.find((variant) => variant.hr === name || variant.en === name)
}

function mapLine(item: OrderItem, product: Product | undefined, index: number): MappedLine | null {
  if (!product) return null
  if (product.variants.length) {
    if (!item.variant) return null
    const variant = variantMatch(product.variants, item.variant)
    const vid = supplierId(variant?.cjVid)
    const sku = supplierId(variant?.cjSku)
    if (!vid && !sku) return null
    return { vid, sku, qty: item.qty, index }
  }
  const vid = supplierId(product.cjVid)
  const sku = supplierId(product.cjSku)
  if (!vid && !sku) return null
  return { vid, sku, qty: item.qty, index }
}

async function markFailed(orderId: number, attempts: number, message: string) {
  const mins = retryMinutes(attempts, message)
  await sql`update orders set cj_status = 'failed', cj_error = ${message}, cj_updated_at = now(),
    cj_next_retry_at = now() + (${mins} * interval '1 minute')
    where id = ${orderId} and cj_order_id = ''`
}

async function linkOrder(orderId: number, linked: { orderId: string; shipmentId: string; status: string; number: string; logistic: string; note: string }) {
  await sql`update orders set
    cj_order_id = ${linked.orderId},
    cj_shipment_id = ${linked.shipmentId},
    cj_order_number = ${linked.number},
    cj_status = ${linked.status.slice(0, 40) || 'CREATED'},
    cj_error = null,
    cj_logistic = ${linked.logistic.slice(0, 80)},
    cj_note = ${linked.note.slice(0, 300)},
    cj_updated_at = now(),
    cj_synced_at = now(),
    supplier_order = case when supplier_order = '' then ${linked.orderId} else supplier_order end
    where id = ${orderId} and (cj_order_id = '' or cj_order_id = ${linked.orderId})`
}

async function findExisting(orderNumber: string): Promise<Detail | null> {
  try {
    const data = await supplierRequest<Detail | null>('GET', '/shopping/order/getOrderDetail', { query: { orderId: orderNumber } })
    if (!data?.orderId && !data?.cjOrderId) return null
    return data
  } catch (e) {
    if (isSupplierNotFound(e)) return null
    throw e
  }
}

async function resolveVid(vid: string, sku: string) {
  if (vid) return vid
  const list = await supplierRequest<{ vid?: string; variantSku?: string }[] | null>('GET', '/product/variant/query', { query: { variantSku: sku } })
  const items = Array.isArray(list) ? list : []
  const hit = items.find((item) => item.variantSku === sku) || items[0]
  const resolved = supplierId(hit?.vid)
  if (!resolved) throw new SupplierError('Varijanta nije pronađena.')
  return resolved
}

async function placeSupplierOrderInner(orderId: number, force: boolean) {
  const [order] = await sql<Order[]>`select * from orders where id = ${orderId}`
  if (!order || order.status !== 'paid' || order.cjOrderId) return { state: 'exists' as const }

  const [claimed] = await sql<{ id: number; cjAttempts: number }[]>`update orders set
    cj_status = 'submitting', cj_attempts = cj_attempts + 1, cj_error = null, cj_updated_at = now()
    where id = ${orderId} and status = 'paid' and cj_order_id = ''
      and (
        ${force}
        or cj_status in ('pending', 'failed')
        or (cj_status = 'submitting' and (cj_updated_at is null or cj_updated_at < now() - interval '10 minutes'))
      )
      and (cj_status is distinct from 'submitting' or cj_updated_at is null or cj_updated_at < now() - interval '10 minutes')
    returning id, cj_attempts`
  if (!claimed) return { state: 'busy' as const }

  const number = supplierOrderNumber(order.id)
  try {
    const ids = [...new Set(order.items.map((item) => item.productId))]
    const products = ids.length ? await sql<Product[]>`select * from products where id in ${sql(ids)}` : []
    const mapped: MappedLine[] = []
    let skipped = 0
    order.items.forEach((item, index) => {
      const line = mapLine(item, products.find((product) => product.id === item.productId), index)
      if (line) mapped.push(line)
      else skipped++
    })
    const note = skipped && mapped.length ? 'Neke stavke nemaju mapiranje.' : ''
    if (!mapped.length) {
      await sql`update orders set cj_status = 'skipped', cj_error = null, cj_note = 'Nema mapiranja.', cj_updated_at = now(), cj_next_retry_at = null
        where id = ${order.id} and cj_order_id = ''`
      return { state: 'skipped' as const }
    }

    const existing = await findExisting(number)
    if (existing) {
      const linkedId = String(existing.orderId || existing.cjOrderId || '')
      if (linkedId) {
        await linkOrder(order.id, {
          orderId: linkedId,
          shipmentId: String(existing.shipmentOrderId || ''),
          status: String(existing.orderStatus || 'CREATED'),
          number,
          logistic: String(existing.logisticName || ''),
          note,
        })
        return { state: 'exists' as const }
      }
    }

    const merged = new Map<string, { vid: string; quantity: number; storeLineItemId: string }>()
    for (const line of mapped) {
      const vid = await resolveVid(line.vid, line.sku)
      const prev = merged.get(vid)
      if (prev) prev.quantity += line.qty
      else merged.set(vid, { vid, quantity: line.qty, storeLineItemId: `${order.id}-${line.index}` })
    }
    const lines = [...merged.values()]
    const settings = await getSettingsFresh()
    const freight = await supplierRequest<FreightOption[] | null>('POST', '/logistic/freightCalculate', {
      body: {
        startCountryCode: settings.supplierFromCountry || 'CN',
        endCountryCode: (order.country || 'HR').toUpperCase(),
        products: lines.map((line) => ({ vid: line.vid, quantity: line.quantity })),
      },
    })
    const choice = pickLogistic(Array.isArray(freight) ? freight.map((option) => ({
      logisticName: String(option.logisticName || ''),
      logisticPrice: Number(option.logisticPrice),
      logisticAging: String(option.logisticAging || ''),
    })) : [], {
      mode: settings.supplierLogisticMode,
      name: settings.supplierLogisticName,
      maxDays: settings.supplierLogisticMaxDays,
    })
    if (!choice) throw new SupplierError('Nema opcije dostave.')

    const dest = supplierDestination(order)
    const created = await supplierRequest<CreateResult | null>('POST', '/shopping/order/createOrderV2', {
      body: {
        orderNumber: number,
        shippingZip: order.postal.slice(0, 20),
        shippingCountryCode: dest.countryCode,
        shippingCountry: dest.country,
        shippingProvince: dest.province,
        shippingCity: dest.city,
        shippingPhone: supplierPhone(order.phone),
        shippingCustomerName: order.name.slice(0, 50),
        shippingAddress: order.address.slice(0, 500),
        email: order.email.slice(0, 50),
        remark: REMARK,
        payType: 3,
        logisticName: choice.logisticName,
        fromCountryCode: settings.supplierFromCountry || 'CN',
        products: lines.map((line) => ({ vid: line.vid, quantity: line.quantity, storeLineItemId: line.storeLineItemId })),
      },
    })
    let orderKey = String(created?.orderId || '')
    let shipmentId = String(created?.shipmentOrderId || '')
    let status = String(created?.orderStatus || 'CREATED')
    if (!orderKey) {
      const again = await findExisting(number)
      orderKey = String(again?.orderId || again?.cjOrderId || '')
      shipmentId = shipmentId || String(again?.shipmentOrderId || '')
      status = String(again?.orderStatus || status)
    }
    if (!orderKey) throw new SupplierError('Nema ID narudžbe.')
    const intercept = (created?.interceptOrderReasons || []).map((reason) => reason.message).filter(Boolean).join('; ')
    await linkOrder(order.id, {
      orderId: orderKey,
      shipmentId,
      status,
      number,
      logistic: choice.logisticName,
      note: [note, intercept].filter(Boolean).join(' ').slice(0, 300),
    })
    return { state: 'created' as const }
  } catch (e) {
    if (e instanceof SupplierError && /exist|duplicate|already/i.test(e.message)) {
      try {
        const again = await findExisting(number)
        const linkedId = String(again?.orderId || again?.cjOrderId || '')
        if (linkedId) {
          await linkOrder(order.id, {
            orderId: linkedId,
            shipmentId: String(again?.shipmentOrderId || ''),
            status: String(again?.orderStatus || 'CREATED'),
            number,
            logistic: String(again?.logisticName || ''),
            note: '',
          })
          return { state: 'exists' as const }
        }
      } catch (lookupError) {
        console.error('[supplier]', order.id, safeSupplierMessage((lookupError as Error).message))
      }
    }
    const message = safeSupplierMessage((e as Error).message)
    await markFailed(order.id, claimed.cjAttempts, message)
    return { state: 'failed' as const, error: message }
  }
}

export async function placeSupplierOrder(orderId: number, opts?: { force?: boolean }) {
  try {
    return await placeSupplierOrderInner(orderId, opts?.force === true)
  } catch (e) {
    const message = safeSupplierMessage((e as Error).message)
    console.error('[supplier]', orderId, message)
    await markFailed(orderId, 1, message)
    return { state: 'failed' as const, error: message }
  }
}

export async function placeSupplierOrderSafely(orderId: number) {
  await placeSupplierOrder(orderId)
}

async function ordersFor(shopId: number | null, cjOrderId: string) {
  if (shopId) {
    const rows = await sql<{ id: number }[]>`select id from orders where id = ${shopId}`
    if (rows.length) return rows
  }
  if (!cjOrderId) return []
  return sql<{ id: number }[]>`select id from orders where cj_order_id = ${cjOrderId}`
}

async function applyStatus(input: { shopId: number | null; cjOrderId: string; status: string; logistic: string; shipped: boolean }) {
  const cjOrderId = supplierId(input.cjOrderId)
  const rows = await ordersFor(input.shopId, cjOrderId)
  const status = input.status.slice(0, 40)
  const logistic = input.logistic.slice(0, 80)
  const shippedIds: number[] = []
  for (const row of rows) {
    if (input.shipped) {
      const [moved] = await sql<{ id: number }[]>`update orders set
        status = 'shipped',
        shipped_at = coalesce(shipped_at, now()),
        cj_status = ${status || 'SHIPPED'},
        cj_order_id = case when cj_order_id = '' and ${cjOrderId} <> '' then ${cjOrderId} else cj_order_id end,
        cj_logistic = case when ${logistic} <> '' then ${logistic} else cj_logistic end,
        cj_synced_at = now(),
        cj_updated_at = now()
        where id = ${row.id} and status = 'paid'
        returning id`
      if (moved) shippedIds.push(moved.id)
      else {
        await sql`update orders set
          cj_status = case when ${status} <> '' then ${status} else cj_status end,
          cj_order_id = case when cj_order_id = '' and ${cjOrderId} <> '' then ${cjOrderId} else cj_order_id end,
          cj_logistic = case when ${logistic} <> '' then ${logistic} else cj_logistic end,
          cj_synced_at = now(),
          cj_updated_at = now()
          where id = ${row.id}`
      }
    } else if (status) {
      await sql`update orders set
        cj_status = ${status},
        cj_order_id = case when cj_order_id = '' and ${cjOrderId} <> '' then ${cjOrderId} else cj_order_id end,
        cj_logistic = case when ${logistic} <> '' then ${logistic} else cj_logistic end,
        cj_synced_at = now(),
        cj_updated_at = now(),
        cj_error = case when ${status.toUpperCase()} = 'CANCELLED' then 'Otkazano kod dobavljača.' else cj_error end
        where id = ${row.id} and status in ('paid', 'shipped', 'delivered')`
    }
  }
  return shippedIds
}

export async function syncSupplierOrder(orderId: number): Promise<number | null> {
  const [order] = await sql<Order[]>`select id, cj_order_id from orders where id = ${orderId}`
  if (!order?.cjOrderId) return null
  let detail: Detail | null
  try {
    detail = await supplierRequest<Detail | null>('GET', '/shopping/order/getOrderDetail', { query: { orderId: order.cjOrderId } })
  } catch (e) {
    await sql`update orders set cj_synced_at = now() where id = ${orderId}`
    throw e
  }
  const status = String(detail?.orderStatus || '')
  const ids = await applyStatus({
    shopId: order.id,
    cjOrderId: String(detail?.orderId || detail?.cjOrderId || order.cjOrderId),
    status,
    logistic: String(detail?.logisticName || ''),
    shipped: supplierShipped(status),
  })
  if (!status) await sql`update orders set cj_synced_at = now() where id = ${orderId}`
  return ids[0] ?? null
}

export async function notifyShippedOrders(ids: number[]) {
  for (const id of ids) {
    const [order] = await sql<Order[]>`select * from orders where id = ${id}`
    if (!order || order.shippedEmailSentAt || order.status === 'pending' || order.status === 'cancelled') continue
    const mail = await sendShipped(order)
    await logShippedEmail(order.id, mail.ok ? { ok: true } : { ok: false, error: mail.error })
  }
}

export async function paySupplierOrder(orderId: number) {
  const settings = await getSettingsFresh()
  if (!settings.supplierPayEnabled) throw new SupplierError('Plaćanje je isključeno.')
  const [order] = await sql<Order[]>`select * from orders where id = ${orderId}`
  if (!order) throw new SupplierError('Narudžba ne postoji.')
  if (order.cjShipmentId) {
    await supplierRequest<unknown>('POST', '/shopping/pay/payBalanceV2', { body: { shipmentOrderId: order.cjShipmentId } })
  } else if (order.cjOrderId) {
    await supplierRequest<unknown>('POST', '/shopping/pay/payBalance', { body: { orderId: order.cjOrderId } })
  } else {
    throw new SupplierError('Nema narudžbe dobavljača.')
  }
  await sql`update orders set cj_error = null, cj_updated_at = now() where id = ${orderId}`
  const shipped = await syncSupplierOrder(orderId)
  if (shipped) await notifyShippedOrders([shipped])
}

export async function drainSupplierWork(limit = 5) {
  const retryIds = await sql<{ id: number }[]>`select id from orders
    where status = 'paid' and cj_order_id = ''
      and (
        (cj_status in ('pending', 'failed') and (cj_next_retry_at is null or cj_next_retry_at <= now()))
        or (cj_status = 'submitting' and cj_updated_at < now() - interval '10 minutes')
      )
    order by paid_at asc nulls last
    limit ${limit}`
  for (const row of retryIds) await placeSupplierOrder(row.id)

  const syncIds = await sql<{ id: number }[]>`select id from orders
    where status = 'paid' and cj_order_id <> ''
      and cj_status not in ('SHIPPED', 'DELIVERED', 'CANCELLED')
      and (cj_synced_at is null or cj_synced_at < now() - interval '30 minutes')
    order by cj_synced_at asc nulls first
    limit ${limit}`
  const shipped: number[] = []
  for (const row of syncIds) {
    try {
      const id = await syncSupplierOrder(row.id)
      if (id) shipped.push(id)
    } catch (e) {
      console.error('[supplier] sync', row.id, safeSupplierMessage((e as Error).message))
    }
  }
  if (shipped.length) await notifyShippedOrders(shipped)
  return { retried: retryIds.length, synced: syncIds.length, shipped: shipped.length }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

export async function applySupplierWebhook(raw: string, headerSign: string) {
  const openId = await supplierOpenId()
  if (!supplierWebhookSignOk(openId, raw, headerSign)) throw new SupplierError('Potpis nije valjan.', 401)
  let message: { type?: string; params?: unknown }
  try {
    message = JSON.parse(raw) as { type?: string; params?: unknown }
  } catch {
    return []
  }
  const params = asRecord(message.params)
  if (!params) return []
  const type = String(message.type || '').toUpperCase()
  if (type === 'ORDER') {
    const orderNumber = String(params.orderNumber || params.orderNum || '')
    return applyStatus({
      shopId: shopOrderIdFromNumber(orderNumber),
      cjOrderId: String(params.cjOrderId || ''),
      status: String(params.orderStatus || ''),
      logistic: String(params.logisticName || ''),
      shipped: supplierShipped(String(params.orderStatus || '')),
    })
  }
  if (type === 'LOGISTIC') {
    const numbers = Array.isArray(params.storeOrderNumbers) ? params.storeOrderNumbers.map((item) => String(item)) : []
    const shopId = numbers.map((item) => shopOrderIdFromNumber(item)).find((id) => id) ?? null
    const trackingStatus = Number(params.trackingStatus)
    if (!supplierTrackingShipped(trackingStatus)) return []
    return applyStatus({
      shopId,
      cjOrderId: String(params.orderId || ''),
      status: trackingStatus === 12 ? 'DELIVERED' : 'SHIPPED',
      logistic: String(params.logisticName || ''),
      shipped: true,
    })
  }
  if (type === 'ORDERSPLIT') {
    const list = Array.isArray(params.splitOrderList) ? params.splitOrderList : []
    const shipped = list.some((row) => supplierShipped(String(asRecord(row)?.orderStatus ?? '')))
    if (!shipped) return []
    return applyStatus({
      shopId: null,
      cjOrderId: String(params.originalOrderId || ''),
      status: 'SHIPPED',
      logistic: '',
      shipped: true,
    })
  }
  return []
}
