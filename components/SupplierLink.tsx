import { supplierHost, supplierHref } from '@/lib/supplier-link'

export function SupplierLink({ url, className = 'link' }: { url: string; className?: string }) {
  const host = supplierHost(url)
  const href = supplierHref(url)
  if (!host || !href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {host} ↗
    </a>
  )
}
