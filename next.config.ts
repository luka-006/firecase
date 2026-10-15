import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
    formats: ['image/avif', 'image/webp'],
  },
  outputFileTracingIncludes: { '/**': ['./assets/**'] },
  serverExternalPackages: ['xml-crypto', '@xmldom/xmldom', 'node-forge', 'pdf-lib', '@pdf-lib/fontkit'],
  async redirects() {
    return [
      { source: '/proizvod/firecase-classic', destination: '/proizvod/zephyr', permanent: true },
      { source: '/proizvod/firecase-noir', destination: '/proizvod/noir', permanent: true },
      { source: '/en/product/firecase-classic', destination: '/en/product/zephyr', permanent: true },
      { source: '/en/product/firecase-noir', destination: '/en/product/noir', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
