import postgres from 'postgres'

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined
}

export const sql =
  globalThis.__sql ??
  postgres(process.env.DATABASE_URL || 'postgres://localhost:5432/firecase', {
    max: 3,
    idle_timeout: 20,
    prepare: false,
    transform: postgres.camel,
    onnotice: () => {},
  })

if (process.env.NODE_ENV !== 'production') globalThis.__sql = sql
