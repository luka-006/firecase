'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { discountCentsFor } from '@/lib/discount'

export type CartItem = {
  key: string
  id: number
  slug: string
  nameHr: string
  nameEn: string
  image: string
  priceCents: number
  vi: number
  variantHr: string
  variantEn: string
  qty: number
}

type Ctx = {
  items: CartItem[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (v: boolean) => void
  add: (item: Omit<CartItem, 'key' | 'qty'>, qty?: number, opts?: { silent?: boolean; upsell?: boolean }) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  upsell: boolean
  discount: number
  shipping: { shippingCents: number; freeThresholdCents: number }
  ready: boolean
}

const CartCtx = createContext<Ctx | null>(null)
const KEY = 'fc_cart'

export function CartProvider({ children, shipping }: { children: React.ReactNode; shipping: Ctx['shipping'] }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [upsell, setUpsell] = useState(false)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
        else {
          setItems(Array.isArray(parsed.items) ? parsed.items : [])
          setUpsell(!!parsed.upsell)
        }
      }
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      const keep = items.length > 0 && upsell
      if (!items.length && upsell) setUpsell(false)
      localStorage.setItem(KEY, JSON.stringify({ items, upsell: keep }))
    } catch {}
  }, [items, upsell, ready])

  const add: Ctx['add'] = useCallback((item, qty = 1, opts) => {
    const key = `${item.id}:${item.vi}`
    setItems((prev) => {
      const found = prev.find((i) => i.key === key)
      if (found) return prev.map((i) => (i.key === key ? { ...i, ...item, qty: Math.min(99, i.qty + qty) } : i))
      return [...prev, { ...item, key, qty }]
    })
    if (opts?.upsell) setUpsell(true)
    if (!opts?.silent) setOpen(true)
  }, [])

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty: Math.min(99, qty) } : i))))
  }, [])
  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), [])
  const clear = useCallback(() => {
    setItems([])
    setUpsell(false)
  }, [])

  const value = useMemo(() => {
    const count = items.reduce((a, i) => a + i.qty, 0)
    const subtotal = items.reduce((a, i) => a + i.qty * i.priceCents, 0)
    const discount = discountCentsFor(subtotal, count, upsell)
    return { items, count, subtotal, open, setOpen, add, setQty, remove, clear, shipping, ready, upsell, discount }
  }, [items, open, add, setQty, remove, clear, shipping, ready, upsell])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const c = useContext(CartCtx)
  if (!c) throw new Error('useCart outside CartProvider')
  return c
}
