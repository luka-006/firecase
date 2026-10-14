import { Link, Text } from '@react-email/components'
import { SITE_URL } from '../config'
import type { Order } from '../types'
import { EmailLayout, heading, muted } from './layout'

export function adminInvoiceFailedSubject(order: Order) {
  return `Račun za narudžbu #${order.id} nije izdan`
}

export function AdminInvoiceFailedEmail({ order, error }: { order: Order; error: string }) {
  const adminUrl = `${SITE_URL}/admin/orders/${order.id}`
  return (
    <EmailLayout preview={adminInvoiceFailedSubject(order)}>
      <Text style={heading}>Narudžba #{order.id}</Text>
      <Text style={{ color: '#e8e4df', margin: '8px 0' }}>Račun nije izdan. Kupcu nije poslan e-mail s računom.</Text>
      {error ? <Text style={{ ...muted, marginTop: 8 }}>{error}</Text> : null}
      <Text style={{ marginTop: 16 }}>
        <Link href={adminUrl} style={{ color: '#fb923c' }}>Otvori u admin panelu</Link>
      </Text>
    </EmailLayout>
  )
}
