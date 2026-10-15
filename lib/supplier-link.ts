/** Hostname without www, for a short supplier link label. Empty when the URL is missing or invalid. */
export function supplierHref(url: string | null | undefined): string | null {
  const raw = (url || '').trim()
  if (!raw) return null
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(withProto)
    if (!parsed.hostname) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function supplierHost(url: string | null | undefined): string | null {
  const href = supplierHref(url)
  if (!href) return null
  try {
    return new URL(href).hostname.replace(/^www\./i, '') || null
  } catch {
    return null
  }
}
