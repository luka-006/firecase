import { Button, Section, Text } from '@react-email/components'
import { t } from '../dict'
import { EmailLayout, btn, heading, muted } from './layout'

export function PasswordResetEmail({ link, locale }: { link: string; locale: 'hr' | 'en' }) {
  const d = t(locale)
  return (
    <EmailLayout preview={d.mailResetSubject}>
      <Text style={heading}>{locale === 'en' ? 'Reset your password' : 'Nova lozinka'}</Text>
      <Text style={{ color: '#e8e4df' }}>{d.mailResetLead}</Text>
      <Section style={{ marginTop: 24, textAlign: 'center' }}>
        <Button href={link} style={btn}>
          {locale === 'en' ? 'Set new password' : 'Postavi novu lozinku'}
        </Button>
      </Section>
      <Text style={{ ...muted, marginTop: 20, fontSize: 13, wordBreak: 'break-all' }}>{link}</Text>
      <Text style={{ ...muted, fontSize: 13 }}>{d.mailResetIgnore}</Text>
    </EmailLayout>
  )
}
