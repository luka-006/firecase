import { Text } from '@react-email/components'
import { t } from '../dict'
import { money } from '../money'
import type { Order } from '../types'
import { EmailLayout, heading, muted } from './layout'

export function RefundEmail({ order }: { order: Order }) {
  const d = t(order.locale)
  const amount = money(order.totalCents, order.locale)
  return (
    <EmailLayout preview={d.mailRefundSubject(order.orderNumber)}>
      <Text style={heading}>{order.locale === 'en' ? 'Refund issued' : 'Povrat novca'}</Text>
      <Text style={{ color: '#e8e4df' }}>{d.mailRefundLead(amount, order.orderNumber)}</Text>
      <Text style={{ ...muted, marginTop: 16, fontSize: 13 }}>{d.mailOrderNo(order.orderNumber)}</Text>
      <Text style={{ color: '#e8e4df', margin: '20px 0 0' }}>{d.mailSignoff}</Text>
    </EmailLayout>
  )
}
