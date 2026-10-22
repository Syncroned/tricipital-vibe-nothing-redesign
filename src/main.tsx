import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const NOTHING_CSS = 'https://cdn.jsdelivr.net/gh/wangbh030722/vibe-nothing-ui-design@main/css/nothing-ui.css'
const FONT_BASE = 'https://cdn.jsdelivr.net/gh/xeji01/nothingfont@main/fonts'

function rgbToHex(rgbLike: string): string | null {
  const m = rgbLike.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/)
  if (!m) return null
  const [r, g, b] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function isValidAccent(color: string | null): boolean {
  if (!color) return false
  const c = color.toLowerCase()
  return c !== '#000000' && c !== '#ffffff' && c !== '#000' && c !== '#fff'
}

// Extract the original instance accent for sub-user links.
// For the main tricipital.com page we return null and fall back to red.
function detectPathAccent(): string | null {
  const path = window.location.pathname
  if (path === '/' || path === '') return null

  // 1. Try the h1 shimmer gradient (most prominent accent declaration)
  const h1 = document.querySelector('h1') as HTMLElement | null
  if (h1) {
    const h1Style = h1.getAttribute('style') || ''
    const hex = h1Style.match(/#[0-9a-fA-F]{6}/)
    if (hex && isValidAccent(hex[0])) return hex[0]
    const rgb = h1Style.match(/rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/)
    if (rgb) {
      const c = rgbToHex(rgb[0])
      if (c && isValidAccent(c)) return c
    }
  }

  // 2. Fallback to the original inline <style> block (the one with body{background:...})
  for (const el of Array.from(document.querySelectorAll('style'))) {
    const css = el.textContent || ''
    if (!css.includes('body{background:')) continue
    const rgbs = css.match(/rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/g) || []
    for (const r of rgbs) {
      const c = rgbToHex(r)
      if (c && isValidAccent(c)) return c
    }
    const hexes = css.match(/#[0-9a-fA-F]{6}/g) || []
    for (const h of hexes) {
      if (isValidAccent(h)) return h
    }
  }

  return null
}

const PATH_ACCENT = detectPathAccent()
const ACCENT = PATH_ACCENT || '#D71921'
const ACCENT_TEXT = PATH_ACCENT || '#FF4438'
const ACCENT_INK = '#FFFFFF'

const FONT_CSS = `
@font-face {
  font-family: 'Ndot57';
  src: url('${FONT_BASE}/Ndot57-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'NType82';
  src: url('${FONT_BASE}/NType82-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'NType82 Headline';
  src: url('${FONT_BASE}/NType82-Headline.otf') format('opentype');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'NType82 Mono';
  src: url('${FONT_BASE}/NType82Mono-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
:root {
  --f-display: 'Ndot57', monospace;
  --f-ui: 'NType82', 'Helvetica Neue', Arial, sans-serif;
  --f-head: 'NType82 Headline', 'NType82', 'Helvetica Neue', Arial, sans-serif;
  --f-mono: 'NType82 Mono', ui-monospace, monospace;
  --f-editorial: 'NType82', Georgia, serif;
}
`

function loadCss(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    link.crossOrigin = 'anonymous'
    link.setAttribute('data-tr-keep', '1')
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load ${url}`))
    document.head.appendChild(link)
  })
}

function injectFontStyle(): void {
  const s = document.createElement('style')
  s.setAttribute('data-tr-keep', '1')
  s.textContent = FONT_CSS
  document.head.appendChild(s)
}

// The original site leaves its stylesheets in <head>; their generic class names
// (.field, .card, .row2, .chips, .label, ...) collide with ours. Remove them and
// keep removing any that get re-injected — ours carry data-tr-keep or our marker text.
function stripForeignStyles(): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('style, link[rel~="stylesheet"]'))) {
    if (el.dataset.trKeep) continue
    const t = el.textContent || ''
    if (t.includes('tr-redesign-root') || t.includes('.tr-shell') || t.includes('Ndot57')) {
      el.setAttribute('data-tr-keep', '1')
      continue
    }
    el.remove()
  }
}

function watchForeignStyles(): void {
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of Array.from(m.addedNodes)) {
        if (!(n instanceof HTMLElement)) continue
        const isStyle = n instanceof HTMLStyleElement
        const isSheet = n instanceof HTMLLinkElement && n.rel === 'stylesheet'
        if (!isStyle && !isSheet) continue
        if (n.dataset.trKeep || (n.textContent || '').includes('tr-redesign-root')) continue
        n.remove()
      }
    }
  }).observe(document.head, { childList: true })
}

async function loadFonts(): Promise<void> {
  if (!document.fonts) return
  await document.fonts.load('1em "Ndot57"')
  await document.fonts.load('1em "NType82"')
  await document.fonts.load('1em "NType82 Headline"')
  await document.fonts.load('1em "NType82 Mono"')
}

function mount() {
  document.documentElement.setAttribute('data-theme', 'dark')
  document.body.innerHTML = ''
  // .appwrap provides the Nothing UI color tokens and dot-field background
  document.body.className = 'appwrap'

  // Override the Nothing UI accent tokens so sub-instances keep their brand color
  document.body.style.setProperty('--accent', ACCENT, 'important')
  document.body.style.setProperty('--accent-text', ACCENT_TEXT, 'important')
  document.body.style.setProperty('--accent-ink', ACCENT_INK, 'important')

  const rootEl = document.createElement('div')
  rootEl.id = 'tr-redesign-root'
  document.body.appendChild(rootEl)

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Unclaimed paths serve a bare "There's no page here." stub with no __SITE
// global — leave it alone. Real request pages (incl. tricipital.com) always
// have either __SITE or a real app body.
const __site = (window as { __SITE?: { name?: string } }).__SITE
const unclaimed = !__site?.name && (document.body.textContent || '').trim().startsWith("There's no page here")

if (!unclaimed) {
  const loader = document.createElement('div')
  loader.className = 'tr-redesign-loading'
  loader.textContent = 'Loading redesign…'
  document.body.appendChild(loader)
  document.body.className = 'appwrap'

  stripForeignStyles()
  watchForeignStyles()

  loadCss(NOTHING_CSS)
    .then(() => {
      injectFontStyle()
      return loadFonts()
    })
    .then(() => mount())
    .catch(() => {
      loader.textContent = 'Design system/fonts failed to load. Refresh to try again.'
    })
}
