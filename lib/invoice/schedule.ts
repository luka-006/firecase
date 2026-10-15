import 'server-only'
import { after } from 'next/server'
import type { Order } from '../types'
import { drainSupplierWork } from '../supplier/fulfill'
import { completePaidOrderDelivery, drainPendingInvoices, kickInvoiceForOrder } from './post-payment'

export function schedulePostPaymentForOrder(order: Order) {
  after(async () => {
    try {
      await completePaidOrderDelivery(order)
    } catch (e) {
      console.error('[post-payment]', order.id, (e as Error).message)
    }
  })
}

export function schedulePendingInvoiceDrain(limit = 5) {
  after(async () => {
    try {
      await drainPendingInvoices(limit)
    } catch (e) {
      console.error('[invoice] drain pending', (e as Error).message)
    }
    try {
      await drainSupplierWork(limit)
    } catch (e) {
      console.error('[supplier] drain', (e as Error).message)
    }
  })
}

export function scheduleKickInvoiceForOrder(orderId: number) {
  after(async () => {
    try {
      await kickInvoiceForOrder(orderId)
    } catch (e) {
      console.error('[invoice] kick', orderId, (e as Error).message)
    }
  })
}
