import 'server-only'
import { Resend } from 'resend'

export const DEFAULT_MAIL_FROM = process.env.MAIL_FROM || 'Firecase <info@firecase.net>'
export const MAIL_REPLY_TO = 'info@firecase.net'

export type MailAttachment = { filename: string; content: Buffer }

export type SendMailResult = { ok: true } | { ok: false; error: string }

let client: Resend | null = null
function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return (client ??= new Resend(key))
}

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  text: string
  attachments?: MailAttachment[]
}): Promise<SendMailResult> {
  const r = resend()
  if (!r) {
    const msg = 'RESEND_API_KEY nije postavljen'
    console.warn('[mail]', msg, opts.subject)
    return { ok: false, error: msg }
  }
  try {
    const { error } = await r.emails.send({
      from: DEFAULT_MAIL_FROM,
      replyTo: MAIL_REPLY_TO,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    })
    if (error) {
      console.error('[mail]', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e) {
    const msg = (e as Error).message
    console.error('[mail]', msg)
    return { ok: false, error: msg }
  }
}
