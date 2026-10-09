import { Section, Text } from '@react-email/components'
import { t } from '../dict'
import type { Locale } from '../routes'
import { EmailLayout, heading, muted } from './layout'

export function OtpCodeEmail({ code, locale }: { code: string; locale: Locale }) {
  const d = t(locale)
  return (
    <EmailLayout preview={d.mailOtpPreview}>
      <Text style={heading}>{d.mailOtpTitle}</Text>
      <Text style={{ color: '#e8e4df', margin: '12px 0 20px' }}>{d.mailOtpLead}</Text>
      <Section
        style={{
          textAlign: 'center',
          padding: '20px 16px',
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          border: '1px solid #2a2a2a',
        }}
      >
        <Text style={{ margin: 0, fontSize: 32, letterSpacing: '0.35em', fontWeight: 600, color: '#fb923c' }}>{code}</Text>
      </Section>
      <Text style={{ ...muted, marginTop: 20, fontSize: 13 }}>{d.mailOtpExpiry}</Text>
      <Text style={{ ...muted, fontSize: 13 }}>{d.mailOtpIgnore}</Text>
    </EmailLayout>
  )
}
