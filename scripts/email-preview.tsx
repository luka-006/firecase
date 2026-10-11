/**
 * Render sample order emails to HTML for review / screenshots.
 * Usage: npx tsx scripts/email-preview.tsx
 */
import fs from 'node:fs'
import path from 'node:path'
import { render } from '@react-email/render'
import { OrderReceivedEmail } from '../lib/emails/order-received'
import { OrderShippedEmail } from '../lib/emails/order-shipped'
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
      name: 'Futrola za BIC J23',
      variant: 'Crvena · M',
      qty: 2,
      unitCents: 1299,
      image: 'https://placehold.co/112x112/1a1a1a/f97316?text=FC',
    },
  ],
  subtotalCents: 2598,
  shippingCents: 350,
  totalCents: 2948,
  locale: 'hr',
  stripeSessionId: null,
  stripePaymentIntent: null,
  paymentMethod: 'Kartica VISA',
  tracking: '',
  carrier: '',
  trackingUrl: '',
  confirmationEmailSentAt: null,
  confirmationEmailError: null,
  shippedEmailSentAt: null,
  shippedEmailError: null,
  supplierOrder: '',
  paidAt: new Date(),
  shippedAt: null,
  createdAt: new Date(),
}

const shipped: Order = {
  ...sampleOrder,
  status: 'shipped',
  tracking: 'LP123456789HR',
  carrier: 'Cainiao / AliExpress Standard',
  trackingUrl: 'https://t.17track.net/en#nums=LP123456789HR',
  shippedAt: new Date(),
}

async function main() {
  const receivedHtml = await render(<OrderReceivedEmail order={sampleOrder} deliveryEstimate="7–14 radnih dana" />)
  const shippedHtml = await render(<OrderShippedEmail order={shipped} />)
  fs.writeFileSync(path.join(outDir, 'mail-1-order-received.html'), receivedHtml)
  fs.writeFileSync(path.join(outDir, 'mail-2-order-shipped.html'), shippedHtml)
  console.log('Wrote', outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
