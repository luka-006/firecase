import { Button, Link, Section, Text } from '@react-email/components'
import type { Locale } from '../routes'
import { SITE_URL } from '../config'
import { t } from '../dict'
import { href } from '../routes'
import type { Order } from '../types'
import { EmailLayout, btn, heading, muted } from './layout'
import { OrderItemsTable } from './order-items'

export function OrderReceivedEmail({
  order,
  deliveryEstimate,
}: {
  order: Order
  deliveryEstimate?: string
}) {
  const l = order.locale
  const d = t(l)
  const orderUrl = `${SITE_URL}${href(l, 'order', order.publicId)}`
  const termsUrl = `${SITE_URL}${href(l, 'terms')}`
  const withdrawalUrl = `${SITE_URL}${href(l, 'withdrawal')}`

  return (
    <EmailLayout preview={d.mailOrderReceivedSubject}>
      <Text style={heading}>{d.mailOrderReceivedSubject}</Text>
      <Text style={{ ...muted, marginTop: 0 }}>{d.mailOrderNo(order.id)}</Text>
      <Text style={{ color: '#e8e4df', margin: '16px 0' }}>{d.mailOrderReceivedLead}</Text>
      {deliveryEstimate ? <Text style={muted}>{d.mailDeliveryEstimate(deliveryEstimate)}</Text> : null}
      <OrderItemsTable items={order.items} shippingCents={order.shippingCents} totalCents={order.totalCents} locale={l} />
      <Section style={{ marginTop: 22 }}>
        <Text style={{ margin: '0 0 8px', fontWeight: 600, color: '#d6d3d1' }}>{d.mailDeliveryAddress}</Text>
        <Text style={{ margin: 0, color: '#e8e4df', lineHeight: 1.55 }}>
          {order.name}
          <br />
          {order.address}
          <br />
          {order.postal} {order.city}, {order.country}
        </Text>
      </Section>
      <Text style={{ ...muted, marginTop: 20, fontSize: 13 }}>
        {d.mailWithdrawalNote}{' '}
        <Link href={withdrawalUrl} style={{ color: '#fb923c' }}>
          {d.withdrawal}
        </Link>
        {' · '}
        <Link href={termsUrl} style={{ color: '#fb923c' }}>
          {d.terms}
        </Link>
      </Text>
      <Section style={{ marginTop: 24, textAlign: 'center' }}>
        <Button href={orderUrl} style={btn}>
          {d.mailViewOrder}
        </Button>
      </Section>
    </EmailLayout>
  )
}
