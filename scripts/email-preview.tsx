/**
 * Render sample order emails to HTML for review / screenshots.
 * Usage: npx tsx scripts/email-preview.tsx
 */
import fs from 'node:fs'
import path from 'node:path'
import { render } from '@react-email/render'
import { InvoiceEmail } from '../lib/emails/invoice-ready'
import { OrderReceivedEmail } from '../lib/emails/order-received'
import { OrderShippedEmail } from '../lib/emails/order-shipped'
import { ReviewRequestEmail } from '../lib/emails/review-request'
import type { Order } from '../lib/types'

const outDir = process.env.EMAIL_PREVIEW_DIR || '/opt/cursor/artifacts/email-previews'
fs.mkdirSync(outDir, { recursive: true })

const sampleOrder: Order = {
  id: 1042,
  publicId: 'preview-public-id',
  userId: null,
  status: 'paid',
  email: 'kupac@example.com',
  name: 'Ana Horvat',
  phone: '+385 91 123 4567',
  address: 'Ilica 10',
  city: 'Zagreb',
  postal: '10000',
  country: 'HR',
  note: '',
  items: [
    {
      productId: 1,
      slug: 'crvena-futrola',
      name: 'Zephyr',
      variant: 'BIC J6 (standardni)',
      qty: 1,
      unitCents: 1499,
      image: 'https://placehold.co/112x112/1a1a1a/ece8e1?text=Z',
    },
    {
      productId: 2,
      slug: 'noir',
      name: 'Noir',
      variant: 'BIC J6 (standardni)',
      qty: 1,
      unitCents: 1699,
      image: 'https://placehold.co/112x112/1a1a1a/d08a2e?text=N',
    },
  ],
  subtotalCents: 3198,
  discountCents: 320,
  shippingCents: 350,
  totalCents: 3228,
  locale: 'hr',
  stripeSessionId: null,
  stripePaymentIntent: null,
  paymentMethod: 'Kartica VISA',
  tracking: '',
  carrier: '',
  trackingUrl: '',
  confirmationEmailSentAt: null,
  confirmationEmailError: null,
  invoiceEmailSentAt: null,
  invoiceEmailError: null,
  invoiceAdminNotifiedAt: null,
  shippedEmailSentAt: null,
  shippedEmailError: null,
  reviewRequestSentAt: null,
  reviewRequestError: null,
  supplierOrder: '',
  cjOrderId: '',
  cjShipmentId: '',
  cjOrderNumber: '',
  cjStatus: '',
  cjError: null,
  cjNote: '',
  cjLogistic: '',
  cjAttempts: 0,
  cjUpdatedAt: null,
  cjSyncedAt: null,
  cjNextRetryAt: null,
  paidAt: new Date(),
  shippedAt: null,
  createdAt: new Date(),
}

const shipped: Order = {
  ...sampleOrder,
  status: 'shipped',
  shippedAt: new Date(),
}

async function main() {
  const receivedHtml = await render(<OrderReceivedEmail order={sampleOrder} deliveryEstimate="8–16 dana" />)
  const invoiceHtml = await render(<InvoiceEmail order={sampleOrder} />)
  const shippedHtml = await render(<OrderShippedEmail order={shipped} deliveryEstimate="8–16 dana" />)
  const reviewHtml = await render(<ReviewRequestEmail order={shipped} url="https://firecase.net/recenzija?t=preview" />)
  fs.writeFileSync(path.join(outDir, 'mail-1-order-received.html'), receivedHtml)
  fs.writeFileSync(path.join(outDir, 'mail-2-invoice.html'), invoiceHtml)
  fs.writeFileSync(path.join(outDir, 'mail-2-order-shipped.html'), shippedHtml)
  fs.writeFileSync(path.join(outDir, 'mail-3-review-request.html'), reviewHtml)
  console.log('Wrote', outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
