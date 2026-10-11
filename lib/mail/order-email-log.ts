import 'server-only'
import { sql } from '../db'

export async function logConfirmationEmail(orderId: number, result: { ok: boolean; error?: string }) {
  if (result.ok) {
    await sql`
      update orders set confirmation_email_sent_at = now(), confirmation_email_error = null where id = ${orderId}`
  } else {
    await sql`
      update orders set confirmation_email_error = ${result.error ?? 'Nepoznata greška'} where id = ${orderId}`
  }
}

export async function logShippedEmail(orderId: number, result: { ok: boolean; error?: string }) {
  if (result.ok) {
    await sql`
      update orders set shipped_email_sent_at = now(), shipped_email_error = null where id = ${orderId}`
  } else {
    await sql`
      update orders set shipped_email_error = ${result.error ?? 'Nepoznata greška'} where id = ${orderId}`
  }
}
