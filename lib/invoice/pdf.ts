import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import { SELLER, SITE_URL } from '../config'
import { money, zagrebParts } from '../money'
import type { Invoice } from '../types'

const INK = rgb(0.09, 0.09, 0.09)
const MUTE = rgb(0.42, 0.42, 0.42)
const LINE = rgb(0.85, 0.85, 0.85)
const FLAME = rgb(0.72, 0.46, 0.16)

export function qrUrl(inv: Invoice) {
  const p = zagrebParts(new Date(inv.issuedAt))
  const datv = `${p.year}${p.month}${p.day}_${p.hour}${p.minute}`
  const code = inv.jir ? `jir=${inv.jir}` : `zki=${inv.zki}`
  return `https://porezna.gov.hr/rn?${code}&datv=${datv}&izn=${inv.totalCents}`
}

export async function renderInvoicePdf(inv: Invoice): Promise<Uint8Array> {
  const d = inv.data
  const en = d.locale === 'en'
  const L = (hr: string, e: string) => (en ? `${hr} / ${e}` : hr)

  const dir = path.join(process.cwd(), 'assets')
  const [reg, bold, logo] = await Promise.all([
    readFile(path.join(dir, 'fonts/Inter_400Regular.ttf')),
    readFile(path.join(dir, 'fonts/Inter_600SemiBold.ttf')),
    readFile(path.join(dir, 'logo-invoice.png')),
  ])
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`Račun ${inv.number}`)
  doc.setAuthor(SELLER.shortName)
  const f = await doc.embedFont(reg, { subset: false })
  const fb = await doc.embedFont(bold, { subset: false })
  const page: PDFPage = doc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const M = 48

  type O = { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }
  const font = (o: O): PDFFont => (o.bold ? fb : f)
  const text = (s: string, x: number, y: number, o: O = {}) =>
    page.drawText(s, { x, y, size: o.size ?? 9.5, font: font(o), color: o.color ?? INK })
  const right = (s: string, xr: number, y: number, o: O = {}) =>
    text(s, xr - font(o).widthOfTextAtSize(s, o.size ?? 9.5), y, o)
  const hline = (y: number) => page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.6, color: LINE })

  // Zaglavlje
  const img = await doc.embedPng(logo)
  const dims = img.scaleToFit(120, 78)
  page.drawImage(img, { x: M - 4, y: height - M - dims.height + 6, width: dims.width, height: dims.height })
  let y = height - M - 4
  const [first, ...rest] = d.seller.legalName.split(', ')
  right(first, width - M, y, { bold: true, size: 10.5 })
  for (const line of [...rest, `${d.seller.address}, ${d.seller.postal} ${d.seller.city}`, `OIB: ${d.seller.oib}`, d.seller.email]) {
    y -= 13
    right(line, width - M, y, { color: MUTE })
  }

  // Naslov
  y = height - M - 120
  const title = inv.stornoOf ? L('STORNO RAČUN', 'CREDIT NOTE') : L('RAČUN', 'INVOICE')
  text(title, M, y, { bold: true, size: 18 })
  text(`br. ${inv.number}`, M + fb.widthOfTextAtSize(title, 18) + 10, y, { size: 18, color: FLAME, bold: true })
  if (d.stornoOfNumber) {
    y -= 16
    text(L(`Storno računa br. ${d.stornoOfNumber}`, `Cancels invoice no. ${d.stornoOfNumber}`), M, y, { color: MUTE })
  }

  // Kupac + podaci računa
  y -= 34
  const topY = y
  text(L('Kupac', 'Buyer'), M, y, { bold: true, color: MUTE, size: 8.5 })
  for (const line of [d.buyer.name, d.buyer.address, `${d.buyer.postal} ${d.buyer.city}`, d.buyer.country, d.buyer.email]) {
    y -= 13
    text(line, M, y)
  }
  let ry = topY
  const meta: [string, string][] = [
    [L('Datum i vrijeme', 'Date and time'), (() => { const t = zagrebParts(new Date(inv.issuedAt)); return `${t.day}.${t.month}.${t.year}. ${t.hour}:${t.minute}:${t.second}` })()],
    [L('Mjesto izdavanja', 'Place of issue'), SELLER.city],
    [L('Način plaćanja', 'Payment method'), d.paymentLabel],
    [L('Oznaka operatera', 'Operator'), d.operatorOib],
    [L('Narudžba', 'Order'), `#${d.orderId}`],
  ]
  for (const [k, v] of meta) {
    right(v, width - M, ry)
    right(k + ':', width - M - 130, ry, { color: MUTE })
    ry -= 13
  }

  // Stavke
  y = Math.min(y, ry) - 30
  const cols = { qty: width - M - 190, unit: width - M - 90, total: width - M }
  text(L('Opis', 'Description'), M, y, { bold: true, size: 8.5, color: MUTE })
  right(L('Kol.', 'Qty'), cols.qty, y, { bold: true, size: 8.5, color: MUTE })
  right(L('Cijena', 'Price'), cols.unit, y, { bold: true, size: 8.5, color: MUTE })
  right(L('Iznos', 'Amount'), cols.total, y, { bold: true, size: 8.5, color: MUTE })
  y -= 8
  hline(y)
  const row = (name: string, qty: string, unit: string, total: string) => {
    y -= 16
    text(name.length > 62 ? name.slice(0, 60) + '…' : name, M, y)
    right(qty, cols.qty, y)
    right(unit, cols.unit, y)
    right(total, cols.total, y)
  }
  for (const i of d.items) {
    row(i.variant ? `${i.name} (${i.variant})` : i.name, String(i.qty), money(i.unitCents), money(i.totalCents))
  }
  row(L('Dostava', 'Shipping'), '1', money(d.shippingCents), money(d.shippingCents))
  y -= 10
  hline(y)
  y -= 22
  right(money(d.totalCents), width - M, y, { bold: true, size: 14 })
  right(L('UKUPNO', 'TOTAL') + ' (EUR):', width - M - 110, y, { bold: true, size: 10, color: MUTE })

  y -= 30
  text(SELLER.vatNoteHr, M, y, { size: 8.5, color: MUTE })
  if (en) {
    y -= 12
    text(SELLER.vatNoteEn, M, y, { size: 8.5, color: MUTE })
  }

  // Fiskalni podaci
  if (inv.zki || inv.jir) {
    y -= 34
    text(`ZKI: ${inv.zki ?? '-'}`, M, y, { size: 8.5 })
    y -= 12
    text(`JIR: ${inv.jir ?? (en ? 'pending / naknadna dostava' : 'u postupku naknadne dostave')}`, M, y, { size: 8.5 })
    const qr = await QRCode.toBuffer(qrUrl(inv), { margin: 1, width: 240, errorCorrectionLevel: 'M' })
    const q = await doc.embedPng(qr)
    page.drawImage(q, { x: width - M - 84, y: y - 40, width: 84, height: 84 })
  }

  // Podnožje
  hline(M + 26)
  text(L('Račun je izdan elektronički i valjan je bez potpisa i pečata.', 'Issued electronically, valid without signature or stamp.'), M, M + 10, { size: 8, color: MUTE })
  right(SITE_URL.replace(/^https?:\/\//, ''), width - M, M + 10, { size: 8, color: MUTE })

  return doc.save()
}
