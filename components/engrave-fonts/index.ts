import localFont from 'next/font/local'

// Loaded only where the engraving preview renders (preload off), latin subset only.
// Closest free matches to the supplier's 12 engraving fonts, same order.
const f1 = localFont({ src: './courgette.woff2', display: 'swap', preload: false })
const f2 = localFont({ src: './unifrakturmaguntia.woff2', display: 'swap', preload: false })
const f3 = localFont({ src: './arimo-bold.woff2', display: 'swap', preload: false })
const f4 = localFont({ src: './charm-bold.woff2', display: 'swap', preload: false })
const f5 = localFont({ src: './charm.woff2', display: 'swap', preload: false })
const f6 = localFont({ src: './playfair-display-italic.woff2', display: 'swap', preload: false })
const f7 = localFont({ src: './cormorant-garamond-italic.woff2', display: 'swap', preload: false })
const f8 = localFont({ src: './herr-von-muellerhoff.woff2', display: 'swap', preload: false })
const f9 = localFont({ src: './playball.woff2', display: 'swap', preload: false })
const f10 = localFont({ src: './dancing-script.woff2', display: 'swap', preload: false })
const f11 = localFont({ src: './allura.woff2', display: 'swap', preload: false })
const f12 = localFont({ src: './sacramento.woff2', display: 'swap', preload: false })

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
