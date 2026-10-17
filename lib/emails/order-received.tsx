import { Section, Text } from '@react-email/components'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../commerce'
import { t } from '../dict'
import { euros } from '../money'
import type { Order } from '../types'
import { EmailLayout, heading, muted } from './layout'
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
  const subject = d.mailOrderReceivedSubject(order.orderNumber)

  return (
    <EmailLayout preview={subject} lang={l === 'en' ? 'en' : 'hr'}>
      <Text style={heading}>{subject}</Text>
      <OrderItemsTable
        items={order.items}
        shippingCents={order.shippingCents}
        discountCents={order.discountCents || 0}
        totalCents={order.totalCents}
        locale={l}
      />
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
      {deliveryEstimate ? <Text style={{ ...muted, marginTop: 16 }}>{d.mailDeliveryEstimate(deliveryEstimate)}</Text> : null}
      <Text style={{ ...muted, marginTop: 8 }}>{d.freeOver(euros(FREE_SHIPPING_THRESHOLD_CENTS, l))}</Text>
      <Text style={{ color: '#e8e4df', margin: '20px 0 0' }}>{d.mailOrderThanks}</Text>
    </EmailLayout>
  )
}
