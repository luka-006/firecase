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
          // Report-Only: Next inline scripts, Turnstile, GA (after consent) and Vercel Analytics must stay allowed before this is enforced.
          { key: 'Content-Security-Policy-Report-Only', value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://va.vercel-scripts.com https://vercel.live",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://vercel.live https://vercel.com",
            "font-src 'self' data:",
            "connect-src 'self' https://challenges.cloudflare.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live",
            "frame-src https://challenges.cloudflare.com https://vercel.live",
            "worker-src 'self' blob:",
          ].join('; ') },
        ],
      },
    ]
  },
}

export default nextConfig
