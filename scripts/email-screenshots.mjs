import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const dir = '/opt/cursor/artifacts/email-previews'
const files = [
  ['mail-1-order-received.html', 'mail-1-order-received.png'],
  ['mail-2-order-shipped.html', 'mail-2-order-shipped.png'],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 640, height: 900 } })
for (const [html, png] of files) {
  const fileUrl = `file://${path.join(dir, html)}`
  await page.goto(fileUrl, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(dir, png), fullPage: true })
}
await browser.close()
console.log('Screenshots in', dir)
