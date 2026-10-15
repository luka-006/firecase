import 'server-only'
import { sql } from '../db'

/** Create a verified user, or reuse the existing one, and attach guest orders. */
export async function ensureVerifiedUser(email: string, name: string) {
  const normalized = email.trim().toLowerCase()
  const [u] = await sql<{ id: number }[]>`
    insert into users (email, password_hash, name, email_verified_at)
    values (${normalized}, null, ${name}, now())
    on conflict (email) do update set
      email_verified_at = coalesce(users.email_verified_at, now())
    returning id`
  await sql`
    update orders set user_id = ${u.id}
    where user_id is null and lower(btrim(email)) = ${normalized}`
  return { id: u.id, email: normalized }
}
