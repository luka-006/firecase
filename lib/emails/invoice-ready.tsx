import { Text } from '@react-email/components'
import { t } from '../dict'
import type { Order } from '../types'
import { EmailLayout } from './layout'

export function InvoiceEmail({ order }: { order: Order }) {
  const d = t(order.locale)
  return (
    <EmailLayout preview={d.mailInvoiceLine} lang={order.locale === 'en' ? 'en' : 'hr'}>
      <Text style={{ color: '#e8e4df', margin: '8px 0 0' }}>{d.mailInvoiceSubject(order.orderNumber)}</Text>
      <Text style={{ color: '#e8e4df', margin: '8px 0 0' }}>{d.mailInvoiceLine}</Text>
      <Text style={{ color: '#e8e4df', margin: '20px 0 0' }}>{d.mailOrderThanks}</Text>
    </EmailLayout>
  )
}
