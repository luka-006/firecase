import localFont from 'next/font/local'

// Loaded only where the engraving preview renders (preload off), latin subset only.
const f1 = localFont({ src: './great-vibes.woff2', display: 'swap', preload: false })
const f2 = localFont({ src: './dancing-script.woff2', display: 'swap', preload: false })
const f3 = localFont({ src: './pacifico.woff2', display: 'swap', preload: false })
const f4 = localFont({ src: './allura.woff2', display: 'swap', preload: false })
const f5 = localFont({ src: './satisfy.woff2', display: 'swap', preload: false })
const f6 = localFont({ src: './lobster.woff2', display: 'swap', preload: false })
const f7 = localFont({ src: './playfair-display.woff2', display: 'swap', preload: false })
const f8 = localFont({ src: './cinzel.woff2', display: 'swap', preload: false })
const f9 = localFont({ src: './abril-fatface.woff2', display: 'swap', preload: false })
const f10 = localFont({ src: './bebas-neue.woff2', display: 'swap', preload: false })
const f11 = localFont({ src: './montserrat.woff2', display: 'swap', preload: false })
const f12 = localFont({ src: './courier-prime.woff2', display: 'swap', preload: false })

/** Font id (see lib/engrave-fonts.ts) to the CSS font-family that renders it. */
export const ENGRAVE_FONT_FAMILY: Record<number, string> = {
  1: f1.style.fontFamily,
  2: f2.style.fontFamily,
  3: f3.style.fontFamily,
  4: f4.style.fontFamily,
  5: f5.style.fontFamily,
  6: f6.style.fontFamily,
  7: f7.style.fontFamily,
  8: f8.style.fontFamily,
  9: f9.style.fontFamily,
  10: f10.style.fontFamily,
  11: f11.style.fontFamily,
  12: f12.style.fontFamily,
}
