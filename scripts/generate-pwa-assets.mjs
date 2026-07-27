// Regenerates every PWA / favicon / splash raster from the Linknbit logo art.
// Source of truth = the SVG mark below (kept in sync with public/brand/*.svg).
// Run: node scripts/generate-pwa-assets.mjs
//
// Design rules: every square icon is the full-bleed square mark (no stretch,
// uniform scale). Splash screens place the centered mark on the brand bg at a
// uniform scale (contain) so nothing is ever stretched or cropped.

import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')
const BRAND_BG = '#1A222D'
const BANNER_SOURCE = join(__dirname, 'banner-source.svg')

// ── The mark, in two coordinate spaces ────────────────────────────────────────
// Full square (1024) art — mark centred with the logo's intended padding.
const squareMark = (fg) => `
  <rect x="312" y="497" width="109.524" height="285.714" rx="1" fill="${fg}"/>
  <rect x="312" y="239.857" width="109.524" height="204.762" rx="1" fill="${fg}"/>
  <rect x="602.476" y="239.857" width="109.524" height="109.524" rx="1" fill="#EE2737"/>
  <rect x="373.905" y="535.095" width="338.095" height="109.524" rx="2.82544" fill="${fg}"/>
  <rect x="312" y="239.857" width="242.857" height="109.524" rx="1" fill="${fg}"/>
  <rect x="602.476" y="397" width="109.524" height="247.619" rx="1" fill="${fg}"/>`

// Glyph only (origin 0,0; intrinsic 400 x 542.857) — for centring on splashes.
const GLYPH_W = 400
const GLYPH_H = 542.857
const glyph = (fg) => `
  <rect x="0" y="257.143" width="109.524" height="285.714" rx="1" fill="${fg}"/>
  <rect x="0" y="0" width="109.524" height="204.762" rx="1" fill="${fg}"/>
  <rect x="290.476" y="0" width="109.524" height="109.524" rx="1" fill="#EE2737"/>
  <rect x="61.905" y="295.238" width="338.095" height="109.524" rx="2.82544" fill="${fg}"/>
  <rect x="0" y="0" width="242.857" height="109.524" rx="1" fill="${fg}"/>
  <rect x="290.476" y="157.143" width="109.524" height="247.619" rx="1" fill="${fg}"/>`

const squareIcon = (bg, fg) =>
  `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${bg}"/>${squareMark(fg)}</svg>`

const DARK_ICON = squareIcon(BRAND_BG, 'white')

const render = (svg, w, h = w) =>
  sharp(Buffer.from(svg)).resize(w, h, { fit: 'fill' }).png()

const out = (name) => join(PUBLIC, name)

async function png(svg, w, h, name) {
  await render(svg, w, h).toFile(out(name))
  console.log('  ✓', name, `${w}x${h ?? w}`)
}

// ── Maskable icon: the MARK only, inside the safe zone ───────────────────────
// Android crops maskable icons to a circle/squircle, so only the central 80%
// (a circle of radius 0.4 × size) is guaranteed to survive. The mark is centred
// and scaled so its bounding-box corners sit at ~72% of that radius — visible
// breathing room under even the most aggressive circular mask.
//
// This must never contain the wordmark: it is the home-screen app icon, not a
// splash screen.
function maskableIconSvg(size) {
  const scale = (size * 0.46) / GLYPH_H
  const mw = GLYPH_W * scale
  const mh = GLYPH_H * scale
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title">
  <title id="title">Linknbit app icon</title>
  <rect width="${size}" height="${size}" fill="${BRAND_BG}"/>
  <g transform="translate(${(size - mw) / 2} ${(size - mh) / 2}) scale(${scale})">${glyph('white')}</g>
</svg>`
}

// ── Splash builder: centred mark + wordmark on the brand bg, uniform scale ─────
function splashSvg(W, H) {
  const scale = (W * 0.34) / GLYPH_W          // mark = 34% of the width
  const mw = GLYPH_W * scale
  const mh = GLYPH_H * scale
  const markX = (W - mw) / 2
  const markY = H * 0.32 - mh / 2
  const titleSize = Math.round(W * 0.064)
  const subSize = Math.round(W * 0.026)
  const bottomMargin = Math.max(H * 0.105, W * 0.28)
  const subY = H - bottomMargin
  const titleY = subY - subSize * 2.55
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title">
  <title id="title">Linknbit splash screen</title>
  <rect width="${W}" height="${H}" fill="${BRAND_BG}"/>
  <g transform="translate(${markX} ${markY}) scale(${scale})">${glyph('white')}</g>
  <text x="${W / 2}" y="${titleY}" text-anchor="middle" fill="#F2F5F9" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="700">Linknbit</text>
  <text x="${W / 2}" y="${subY}" text-anchor="middle" fill="#B5C0CF" font-family="Arial, Helvetica, sans-serif" font-size="${subSize}" font-weight="700" letter-spacing="${Math.round(subSize * 0.28)}">OPERATIONS PORTAL</text>
</svg>`
}

async function main() {
  await mkdir(join(PUBLIC, 'icons'), { recursive: true })
  await mkdir(join(PUBLIC, 'splash'), { recursive: true })

  console.log('Icons:')
  // Square icons (dark, full-bleed) — all square so no distortion.
  const squareTargets = [
    ['icons/favicon-16x16.png', 16],
    ['icons/favicon-32x32.png', 32],
    ['icons/favicon-48x48.png', 48],
    ['icons/pwa-192x192.png', 192],
    ['icons/pwa-512x512.png', 512],
    ['icons/apple-touch-icon.png', 180],
    ['icons/mstile-150x150.png', 150],
  ]
  for (const [name, size] of squareTargets) await png(DARK_ICON, size, size, name)

  // Maskable variants. These used to be written from the SPLASH art (mark plus
  // "Linknbit / OPERATIONS PORTAL") and both files were byte-identical, so the
  // manifest ended up advertising a banner as the app icon and Android installed
  // it as such.
  for (const size of [512, 1024]) {
    await png(maskableIconSvg(size), size, size, `icons/pwa-maskable-${size}x${size}.png`)
  }

  // favicon.ico (16 / 32 / 48)
  const icoBufs = await Promise.all(
    [16, 32, 48].map((s) => render(DARK_ICON, s, s).toBuffer()),
  )
  await writeFile(out('favicon.ico'), await pngToIco(icoBufs))
  console.log('  ✓ favicon.ico (16/32/48)')

  console.log('Splash screens:')
  const splashSizes = [
    [1290, 2796], [1179, 2556], [1170, 2532],
    [1125, 2436], [1242, 2688], [828, 1792],
  ]
  for (const [w, h] of splashSizes) {
    await png(splashSvg(w, h), w, h, `splash/apple-splash-${w}x${h}.png`)
  }
  const squareSplash = splashSvg(2048, 2048)
  await png(squareSplash, 2048, 2048, 'splash/linknbit-splash-2048.png')
  await writeFile(out('splash/linknbit-splash.svg'), squareSplash)
  console.log('  ✓ splash/linknbit-splash.svg 2048x2048')

  // ── Social / install artwork from the supplied wide banner ──────────────────
  console.log('Banner artwork:')
  try {
    await sharp(BANNER_SOURCE)
      .resize(1440, 1024, { fit: 'fill' })
      .png()
      .toFile(join(__dirname, 'banner-source.png'))
    console.log('  ✓ scripts/banner-source.png 1440x1024')

    await sharp(BANNER_SOURCE)
      .resize(1200, 630, { fit: 'contain', background: BRAND_BG })
      .png()
      .toFile(out('og-image.png'))
    console.log('  ✓ og-image.png 1200x630')

    await sharp(BANNER_SOURCE)
      .resize(1440, 1024, { fit: 'fill' })
      .png()
      .toFile(out('install-banner.png'))
    console.log('  ✓ install-banner.png 1440x1024')
  } catch {
    console.log('  – banner artwork skipped (no scripts/banner-source.svg)')
  }

  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
