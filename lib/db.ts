import postgres from 'postgres'
import { databaseUrl } from './schema.mjs'

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined
}

export const sql =
  globalThis.__sql ??
  postgres(databaseUrl() || 'postgres://localhost:5432/firecase', {
    max: 3,
    idle_timeout: 20,
    prepare: false,
    transform: postgres.camel,
    onnotice: () => {},
  })

if (process.env.NODE_ENV !== 'production') globalThis.__sql = sql
