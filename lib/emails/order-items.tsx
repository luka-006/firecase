import { Column, Img, Row, Section, Text } from '@react-email/components'
import type { Locale } from '../routes'
import { t } from '../dict'
import { money } from '../money'
import type { OrderItem } from '../types'
import { absImageUrl } from './util'

export function OrderItemsTable({
  items,
  shippingCents,
  totalCents,
  locale,
}: {
  items: OrderItem[]
  shippingCents: number
  totalCents: number
  locale: Locale
}) {
  const d = t(locale)
  return (
    <Section style={{ marginTop: 20 }}>
      <Text style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#d6d3d1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {d.mailItems}
      </Text>
      {items.map((item, idx) => {
        const img = absImageUrl(item.image)
        return (
          <Row key={idx} style={{ borderTop: idx ? '1px solid #2a2a2a' : undefined, padding: '12px 0' }}>
            {img && (
              <Column style={{ width: 64, verticalAlign: 'top' }}>
                <Img src={img} alt="" width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' as const, backgroundColor: '#1f1f1f' }} />
              </Column>
            )}
            <Column style={{ verticalAlign: 'top', paddingLeft: img ? 12 : 0 }}>
              <Text style={{ margin: 0, fontWeight: 500, color: '#f5f2ed' }}>{item.name}</Text>
              {item.variant ? (
                <Text style={{ margin: '4px 0 0', fontSize: 13, color: '#a8a29e' }}>{item.variant}</Text>
              ) : null}
              <Text style={{ margin: '6px 0 0', fontSize: 13, color: '#d6d3d1' }}>
                {d.qty}: {item.qty} · {money(item.unitCents * item.qty, locale)}
              </Text>
            </Column>
          </Row>
        )
      })}
      <Row style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10, marginTop: 4 }}>
        <Column>
          <Text style={{ margin: 0, color: '#a8a29e' }}>{d.mailShipping}</Text>
        </Column>
        <Column align="right">
          <Text style={{ margin: 0, color: '#e8e4df' }}>{money(shippingCents, locale)}</Text>
        </Column>
      </Row>
      <Row style={{ paddingTop: 6 }}>
        <Column>
          <Text style={{ margin: 0, fontWeight: 600, color: '#f5f2ed' }}>{d.mailTotal}</Text>
        </Column>
        <Column align="right">
          <Text style={{ margin: 0, fontWeight: 600, color: '#fb923c' }}>{money(totalCents, locale)}</Text>
        </Column>
      </Row>
    </Section>
  )
}
