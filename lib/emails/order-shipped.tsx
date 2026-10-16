import { Text } from '@react-email/components'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../commerce'
import { t } from '../dict'
import { euros } from '../money'
import type { Order } from '../types'
import { EmailLayout, heading, muted } from './layout'

export function OrderShippedEmail({
  order,
  deliveryEstimate,
}: {
  order: Order
  deliveryEstimate?: string
}) {
  const l = order.locale
  const d = t(l)

  return (
    <EmailLayout preview={d.mailOrderShippedLead} lang={l === 'en' ? 'en' : 'hr'}>
      <Text style={heading}>{d.mailOrderNo(order.orderNumber)}</Text>
      <Text style={{ color: '#e8e4df', margin: '16px 0' }}>{d.mailOrderShippedLead}</Text>
      {deliveryEstimate ? <Text style={{ ...muted, marginTop: 0 }}>{d.mailDeliveryEstimate(deliveryEstimate)}</Text> : null}
      <Text style={{ ...muted, marginTop: 8 }}>{d.freeOver(euros(FREE_SHIPPING_THRESHOLD_CENTS, l))}</Text>
      <Text style={{ color: '#e8e4df', margin: '20px 0 0' }}>{d.mailOrderThanks}</Text>
    </EmailLayout>
  )
}
