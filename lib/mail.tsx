import 'server-only'
import { SELLER } from './config'
import { t } from './dict'
import { AdminInvoiceFailedEmail, adminInvoiceFailedSubject } from './emails/admin-invoice-failed'
import { AdminNewOrderEmail, adminNewOrderSubject } from './emails/admin-new-order'
import { InvoiceEmail } from './emails/invoice-ready'
import { OrderReceivedEmail } from './emails/order-received'
import { OrderShippedEmail } from './emails/order-shipped'
import { OtpCodeEmail } from './emails/otp-code'
import { PasswordResetEmail } from './emails/password-reset'
import { RefundEmail } from './emails/refund'
import { ReviewRequestEmail } from './emails/review-request'
import { renderEmail } from './emails/render-email'
import { sendEmail, type MailAttachment, type SendMailResult } from './mail/send'
import type { Order } from './types'

export type { SendMailResult, MailAttachment }

async function sendRendered(
  to: string,
  subject: string,
  element: React.ReactElement,
  attachments?: MailAttachment[],
): Promise<SendMailResult> {
  const { html, text } = await renderEmail(element)
  return sendEmail({ to, subject, html, text, attachments })
}

export async function sendOrderConfirmation(o: Order, delivery?: string): Promise<SendMailResult> {
  const d = t(o.locale)
  return sendRendered(
    o.email,
    d.mailOrderReceivedSubject(o.id),
    <OrderReceivedEmail order={o} deliveryEstimate={delivery} />,
  )
}

export async function sendInvoiceEmail(
  o: Order,
  invoicePdf: { number: string; pdf: Uint8Array },
): Promise<SendMailResult> {
  const d = t(o.locale)
  return sendRendered(
    o.email,
    d.mailInvoiceSubject(o.id),
    <InvoiceEmail order={o} />,
    [{ filename: `racun-${invoicePdf.number.replace(/\//g, '-')}.pdf`, content: Buffer.from(invoicePdf.pdf) }],
  )
}

export async function sendAdminInvoiceFailed(o: Order, error: string): Promise<SendMailResult> {
  const to = process.env.ORDER_NOTIFY_EMAIL || SELLER.email
  return sendRendered(to, adminInvoiceFailedSubject(o), <AdminInvoiceFailedEmail order={o} error={error} />)
}

export async function sendAdminNewOrder(o: Order): Promise<SendMailResult> {
  const to = process.env.ORDER_NOTIFY_EMAIL || SELLER.email
  return sendRendered(to, adminNewOrderSubject(o), <AdminNewOrderEmail order={o} />)
}

export async function sendShipped(o: Order): Promise<SendMailResult> {
  const d = t(o.locale)
  return sendRendered(o.email, d.mailOrderShippedSubject, <OrderShippedEmail order={o} />)
}

export async function sendReviewRequest(o: Order, url: string): Promise<SendMailResult> {
  const d = t(o.locale === 'en' ? 'en' : 'hr')
  return sendRendered(o.email, d.mailReviewSubject, <ReviewRequestEmail order={o} url={url} />)
}

export async function sendRefunded(
  o: Order,
  pdf?: { number: string; pdf: Uint8Array },
): Promise<SendMailResult> {
  const d = t(o.locale)
  const attachments = pdf
    ? [{ filename: `storno-${pdf.number.replace(/\//g, '-')}.pdf`, content: Buffer.from(pdf.pdf) }]
    : undefined
  return sendRendered(o.email, d.mailRefundSubject(o.id), <RefundEmail order={o} />, attachments)
}

export async function sendOtpCode(email: string, code: string, locale: 'hr' | 'en'): Promise<SendMailResult> {
  const d = t(locale)
  return sendRendered(email, d.mailOtpSubject, <OtpCodeEmail code={code} locale={locale} />)
}

export async function sendPasswordReset(email: string, link: string, en: boolean): Promise<SendMailResult> {
  const locale = en ? 'en' : 'hr'
  const d = t(locale)
  return sendRendered(email, d.mailResetSubject, <PasswordResetEmail link={link} locale={locale} />)
}
