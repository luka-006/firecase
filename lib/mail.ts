import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import { SELLER, SITE_URL } from './config'
import { money } from './money'
import { href } from './routes'
import type { Order } from './types'

let transporter: Transporter | null = null
function tx() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  const port = Number(process.env.SMTP_PORT || 465)
  return (transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }))
}

type Attachment = { filename: string; content: Buffer }

export async function sendMail(to: string, subject: string, html: string, attachments?: Attachment[]) {
  const t = tx()
  if (!t) {
    console.warn('[mail] SMTP nije postavljen, preskačem:', subject)
    return false
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || `Firecase <${process.env.SMTP_USER}>`, to, subject, html, attachments })
    return true
  } catch (e) {
    console.error('[mail]', (e as Error).message)
    return false
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function layout(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ef;font-family:Helvetica,Arial,sans-serif;color:#171717">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#0a0a0a;padding:28px;text-align:center;border-radius:14px 14px 0 0">
<img src="${SITE_URL}/logo-word.png" alt="FIRECASE" width="180" style="display:inline-block;max-width:180px"></div>
<div style="background:#fff;padding:28px;border-radius:0 0 14px 14px;font-size:15px;line-height:1.55">${body}</div>
<p style="font-size:12px;color:#777;text-align:center;margin-top:18px">${esc(SELLER.legalName)}<br>${SELLER.address}, ${SELLER.postal} ${SELLER.city} · OIB ${SELLER.oib}<br><a href="mailto:${SELLER.email}" style="color:#777">${SELLER.email}</a></p>
</div></body></html>`
}

function itemsTable(o: Order) {
  const l = o.locale
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.name)}${i.variant ? ` <span style="color:#777">(${esc(i.variant)})</span>` : ''} × ${i.qty}</td><td style="text-align:right">${money(i.unitCents * i.qty, l)}</td></tr>`)
    .join('')
  const t = l === 'en' ? ['Shipping', 'Total'] : ['Dostava', 'Ukupno']
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:6px 0;border-top:1px solid #eee">${t[0]}</td><td style="text-align:right;border-top:1px solid #eee">${money(o.shippingCents, l)}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold">${t[1]}</td><td style="text-align:right;font-weight:bold">${money(o.totalCents, l)}</td></tr></table>`
}

export async function sendOrderConfirmation(o: Order, invoicePdf?: { number: string; pdf: Uint8Array }, delivery?: string) {
  const en = o.locale === 'en'
  const l = o.locale
  const body = en
    ? `<h2 style="margin-top:0">Thank you for your order!</h2>
<p>Your order <b>#${o.id}</b> has been received and paid. We will notify you when it ships.${delivery ? ` Expected delivery: <b>${esc(delivery)}</b>.` : ''}</p>
${itemsTable(o)}
<p><b>Delivery address</b><br>${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.postal)} ${esc(o.city)}, ${esc(o.country)}</p>
<p style="font-size:13px;color:#555"><b>Right of withdrawal:</b> you may withdraw from this contract within 14 days of receiving the goods without giving any reason. Use the <a href="${SITE_URL}${href(l, 'withdrawal')}">withdrawal form</a> or email us. Full details are in our <a href="${SITE_URL}${href(l, 'terms')}">Terms and Conditions</a>. The invoice is attached.</p>
<p><a href="${SITE_URL}${href(l, 'order', o.publicId)}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">View order</a></p>`
    : `<h2 style="margin-top:0">Hvala na narudžbi!</h2>
<p>Vaša narudžba <b>#${o.id}</b> je zaprimljena i plaćena. Javit ćemo vam kad bude poslana.${delivery ? ` Očekivana dostava: <b>${esc(delivery)}</b>.` : ''}</p>
${itemsTable(o)}
<p><b>Adresa dostave</b><br>${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.postal)} ${esc(o.city)}, ${esc(o.country)}</p>
<p style="font-size:13px;color:#555"><b>Pravo na jednostrani raskid ugovora:</b> ugovor možete raskinuti u roku od 14 dana od primitka robe bez navođenja razloga. Koristite <a href="${SITE_URL}${href(l, 'withdrawal')}">obrazac za jednostrani raskid</a> ili nam pošaljite e-mail. Sve informacije nalaze se u <a href="${SITE_URL}${href(l, 'terms')}">Uvjetima poslovanja</a>. Račun je u privitku.</p>
<p><a href="${SITE_URL}${href(l, 'order', o.publicId)}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Pregled narudžbe</a></p>`
  const attachments = invoicePdf
    ? [{ filename: `racun-${invoicePdf.number.replace(/\//g, '-')}.pdf`, content: Buffer.from(invoicePdf.pdf) }]
    : undefined
  return sendMail(o.email, en ? `Order #${o.id} confirmed – Firecase` : `Narudžba #${o.id} potvrđena – Firecase`, layout(body), attachments)
}

export async function sendAdminNewOrder(o: Order) {
  const to = process.env.ORDER_NOTIFY_EMAIL || SELLER.email
  const body = `<h2 style="margin-top:0">Nova narudžba #${o.id}</h2>
${itemsTable({ ...o, locale: 'hr' })}
<p><b>Kupac</b><br>${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.postal)} ${esc(o.city)}, ${esc(o.country)}<br>${esc(o.email)}${o.phone ? '<br>' + esc(o.phone) : ''}</p>
${o.note ? `<p><b>Napomena:</b> ${esc(o.note)}</p>` : ''}
<p>Plaćanje: ${esc(o.paymentMethod || '-')}</p>
<p><a href="${SITE_URL}/admin/orders/${o.id}">Otvori u admin panelu</a></p>`
  return sendMail(to, `Nova narudžba #${o.id} – ${money(o.totalCents)}`, layout(body))
}

export async function sendShipped(o: Order) {
  const en = o.locale === 'en'
  const body = en
    ? `<h2 style="margin-top:0">Your order is on its way</h2><p>Order <b>#${o.id}</b> has been shipped.${o.tracking ? `<br>Tracking: <b>${esc(o.tracking)}</b>` : ''}</p>`
    : `<h2 style="margin-top:0">Vaša narudžba je na putu</h2><p>Narudžba <b>#${o.id}</b> je poslana.${o.tracking ? `<br>Praćenje pošiljke: <b>${esc(o.tracking)}</b>` : ''}</p>`
  return sendMail(o.email, en ? `Order #${o.id} shipped – Firecase` : `Narudžba #${o.id} je poslana – Firecase`, layout(body))
}

export async function sendRefunded(o: Order, pdf?: { number: string; pdf: Uint8Array }) {
  const en = o.locale === 'en'
  const body = en
    ? `<h2 style="margin-top:0">Refund issued</h2><p>We have refunded <b>${money(o.totalCents, 'en')}</b> for order <b>#${o.id}</b> to your original payment method. The credit note is attached.</p>`
    : `<h2 style="margin-top:0">Povrat novca</h2><p>Iznos od <b>${money(o.totalCents)}</b> za narudžbu <b>#${o.id}</b> vraćen je na vaše izvorno sredstvo plaćanja. Storno račun je u privitku.</p>`
  const attachments = pdf ? [{ filename: `storno-${pdf.number.replace(/\//g, '-')}.pdf`, content: Buffer.from(pdf.pdf) }] : undefined
  return sendMail(o.email, en ? `Refund for order #${o.id} – Firecase` : `Povrat novca za narudžbu #${o.id} – Firecase`, layout(body), attachments)
}

export async function sendPasswordReset(email: string, link: string, en: boolean) {
  const body = en
    ? `<h2 style="margin-top:0">Reset your password</h2><p>Click the link below to set a new password. The link is valid for 1 hour.</p><p><a href="${link}">${link}</a></p><p style="color:#777;font-size:13px">If you did not request this, ignore this email.</p>`
    : `<h2 style="margin-top:0">Nova lozinka</h2><p>Kliknite poveznicu za postavljanje nove lozinke. Poveznica vrijedi 1 sat.</p><p><a href="${link}">${link}</a></p><p style="color:#777;font-size:13px">Ako niste zatražili promjenu, zanemarite ovaj e-mail.</p>`
  return sendMail(email, en ? 'Reset your password – Firecase' : 'Postavljanje nove lozinke – Firecase', layout(body))
}
