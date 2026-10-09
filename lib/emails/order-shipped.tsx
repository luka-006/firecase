import { Button, Section, Text } from '@react-email/components'
import { t } from '../dict'
import type { Order } from '../types'
import { EmailLayout, btn, heading, muted } from './layout'
import { OrderItemsTable } from './order-items'

export function OrderShippedEmail({ order }: { order: Order }) {
  const l = order.locale
  const d = t(l)
  const trackUrl = order.trackingUrl?.trim()

  return (
    <EmailLayout preview={d.mailOrderShippedSubject}>
      <Text style={heading}>{d.mailOrderShippedSubject}</Text>
      <Text style={{ ...muted, marginTop: 0 }}>{d.mailOrderNo(order.id)}</Text>
      <Text style={{ color: '#e8e4df', margin: '16px 0' }}>{d.mailOrderShippedLead}</Text>
      <OrderItemsTable items={order.items} shippingCents={order.shippingCents} totalCents={order.totalCents} locale={l} />
      {(order.carrier || order.tracking) && (
        <Section style={{ marginTop: 22, padding: 16, backgroundColor: '#1a1a1a', borderRadius: 12, border: '1px solid #2a2a2a' }}>
          {order.carrier ? (
            <Text style={{ margin: '0 0 8px', color: '#e8e4df' }}>
              <b>{d.mailCarrier}:</b> {order.carrier}
            </Text>
          ) : null}
          {order.tracking ? (
            <Text style={{ margin: 0, color: '#e8e4df' }}>
              <b>{d.mailTrackingNo}:</b> {order.tracking}
            </Text>
          ) : null}
        </Section>
      )}
      {trackUrl ? (
        <Section style={{ marginTop: 20, textAlign: 'center' }}>
          <Button href={trackUrl} style={btn}>
            {d.mailTrackPackage}
          </Button>
        </Section>
      ) : null}
      <Text style={{ ...muted, marginTop: 22, fontSize: 13 }}>{d.mailSupplierShipNote}</Text>
    </EmailLayout>
  )
}
