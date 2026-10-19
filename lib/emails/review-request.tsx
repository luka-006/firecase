import { Button, Column, Img, Row, Section, Text } from '@react-email/components'
import { t } from '../dict'
import type { Order } from '../types'
import { EmailLayout, btn, heading, muted } from './layout'
import { absImageUrl } from './util'

export function ReviewRequestEmail({ order, url, code }: { order: Order; url: string; code?: string }) {
  const l = order.locale === 'en' ? 'en' : 'hr'
  const d = t(l)
  const first = order.name.trim().split(/\s+/)[0]

  return (
    <EmailLayout preview={d.mailReviewLead} lang={l}>
      <Text style={heading}>{d.mailReviewHeading}</Text>
      {first ? <Text style={{ color: '#e8e4df', margin: '0 0 8px' }}>{d.mailReviewGreeting(first)}</Text> : null}
      <Text style={{ ...muted, marginTop: 0 }}>{d.mailOrderNo(order.orderNumber)}</Text>
      <Text style={{ color: '#e8e4df', margin: '16px 0' }}>{d.mailReviewLead}</Text>
      <Section style={{ marginTop: 8, padding: '4px 16px', backgroundColor: '#1a1a1a', borderRadius: 12, border: '1px solid #2a2a2a' }}>
        {order.items.map((item, idx) => {
          const img = absImageUrl(item.image)
          return (
            <Row key={idx} style={{ borderTop: idx ? '1px solid #2a2a2a' : undefined }}>
              {img ? (
                <Column style={{ width: 72, verticalAlign: 'middle' }}>
                  <Img src={img} alt="" width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' as const, backgroundColor: '#1f1f1f' }} />
                </Column>
              ) : null}
              <Column style={{ verticalAlign: 'middle', paddingLeft: img ? 12 : 0 }}>
                <Text style={{ margin: '12px 0', fontWeight: 500, color: '#f5f2ed' }}>
                  {item.name}
                  {item.variant ? ` · ${item.variant}` : ''}
                  {item.qty > 1 ? ` × ${item.qty}` : ''}
                </Text>
              </Column>
            </Row>
          )
        })}
      </Section>
      <Section style={{ marginTop: 22, textAlign: 'center' }}>
        <Button href={url} style={btn}>
          {d.mailReviewCta}
        </Button>
      </Section>
      {code ? <Text style={{ color: '#e8e4df', margin: '22px 0 0' }}>{d.mailReviewPromo(code)}</Text> : null}
      <Text style={{ color: '#e8e4df', margin: '20px 0 0' }}>{d.mailOrderThanks}</Text>
    </EmailLayout>
  )
}
