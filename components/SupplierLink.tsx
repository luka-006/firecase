import { supplierHref } from '@/lib/supplier-link'

export function SupplierLink({ url, className = 'link', label = 'Dobavljač' }: { url: string; className?: string; label?: string }) {
  const href = supplierHref(url)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label} ↗
    </a>
  )
}
