import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import { SELLER, SITE_URL } from '../config'

const font =
  "'Montserrat', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="hr">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: '#0a0a0a', fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
          <Section
            style={{
              backgroundColor: '#111111',
              borderRadius: '16px 16px 0 0',
              padding: '28px 24px',
              textAlign: 'center',
              border: '1px solid #262626',
              borderBottom: 'none',
            }}
          >
            <Img src={`${SITE_URL}/logo-word.png`} alt="FIRECASE" width={168} style={{ margin: '0 auto' }} />
          </Section>
          <Section
            style={{
              backgroundColor: '#141414',
              borderRadius: '0 0 16px 16px',
              padding: '28px 24px',
              border: '1px solid #262626',
              borderTop: 'none',
              color: '#e8e4df',
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            {children}
          </Section>
          <Text
            style={{
              fontSize: 12,
              color: '#8a8580',
              textAlign: 'center',
              marginTop: 20,
              lineHeight: 1.5,
            }}
          >
            {SELLER.legalName}
            <br />
            {SELLER.address}, {SELLER.postal} {SELLER.city} · OIB {SELLER.oib}
            <br />
            <Link href={`mailto:${SELLER.email}`} style={{ color: '#8a8580' }}>
              {SELLER.email}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const heading = { margin: '0 0 12px', fontSize: 22, fontWeight: 600 as const, color: '#f5f2ed' }
export const muted = { color: '#a8a29e', fontSize: 14, lineHeight: 1.55 as const }
export const btn = {
  display: 'inline-block' as const,
  backgroundColor: '#f97316',
  color: '#0a0a0a',
  padding: '12px 22px',
  borderRadius: 999,
  fontWeight: 600 as const,
  textDecoration: 'none' as const,
  fontSize: 14,
}
