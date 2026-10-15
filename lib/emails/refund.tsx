import { Text } from '@react-email/components'
import { t } from '../dict'
import { money } from '../money'
import type { Order } from '../types'
import { EmailLayout, heading, muted } from './layout'

export function RefundEmail({ order }: { order: Order }) {
  const d = t(order.locale)
  const amount = money(order.totalCents, order.locale)
  return (
    <EmailLayout preview={d.mailRefundSubject(order.id)}>
      <Text style={heading}>{order.locale === 'en' ? 'Refund issued' : 'Povrat novca'}</Text>
      <Text style={{ color: '#e8e4df' }}>{d.mailRefundLead(amount, order.id)}</Text>
      <Text style={{ ...muted, marginTop: 16, fontSize: 13 }}>{d.mailOrderNo(order.id)}</Text>
    </EmailLayout>
  )
}
