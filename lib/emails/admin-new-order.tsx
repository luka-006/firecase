import { Link, Section, Text } from '@react-email/components'
import { SELLER, SITE_URL } from '../config'
import { money } from '../money'
import type { Order } from '../types'
import { EmailLayout, heading, muted } from './layout'
import { OrderItemsTable } from './order-items'

export function AdminNewOrderEmail({ order }: { order: Order }) {
  const adminUrl = `${SITE_URL}/admin/orders/${order.id}`
  return (
    <EmailLayout preview={`Nova narudžba #${order.id}`}>
      <Text style={heading}>Nova narudžba #{order.id}</Text>
      <OrderItemsTable
        items={order.items}
        shippingCents={order.shippingCents}
        totalCents={order.totalCents}
        locale="hr"
      />
      <Section style={{ marginTop: 20 }}>
        <Text style={{ margin: '0 0 8px', fontWeight: 600, color: '#d6d3d1' }}>Kupac</Text>
        <Text style={{ margin: 0, color: '#e8e4df', lineHeight: 1.55 }}>
          {order.name}
          <br />
          {order.address}
          <br />
          {order.postal} {order.city}, {order.country}
          <br />
          {order.email}
          {order.phone ? <><br />{order.phone}</> : null}
        </Text>
      </Section>
      {order.note ? <Text style={{ ...muted, marginTop: 16 }}><b style={{ color: '#e8e4df' }}>Napomena:</b> {order.note}</Text> : null}
      <Text style={{ ...muted, marginTop: 12 }}>Plaćanje: {order.paymentMethod || '—'}</Text>
      <Text style={{ marginTop: 20 }}>
        <Link href={adminUrl} style={{ color: '#fb923c' }}>Otvori u admin panelu</Link>
      </Text>
      <Text style={{ ...muted, fontSize: 12, marginTop: 16 }}>{SELLER.legalName}</Text>
    </EmailLayout>
  )
}

export function adminNewOrderSubject(order: Order) {
  return `Nova narudžba #${order.id} – ${money(order.totalCents)}`
}
