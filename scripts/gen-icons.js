// Gera public/icons/*.png sem dependências: encoder PNG mínimo (zlib do Node).
// Design: fundo preto ink, barras ascendentes amarelo manteiga + moeda.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

// Ícones já gerados? Não refaz (evita sobrescrever no CI)
if (existsSync(join(outDir, 'icon-512.png')) && process.env.CI) {
  console.log('Ícones já existem — pulando geração')
  process.exit(0)
}
mkdirSync(outDir, { recursive: true })

// ---------- encoder PNG ----------
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(w, h, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0 // filter none
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// ---------- desenho ----------
function drawIcon(size, padding = 0.16) {
  const px = Buffer.alloc(size * size * 3)
  const bg = [10, 10, 12] // #0a0a0c
  const fg = [246, 211, 83] // #f6d353
  const fg2 = [242, 198, 46] // #f2c62e
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 3
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]
  }
  const rect = (x0, y0, w, h, c) => {
    for (let y = Math.round(y0); y < y0 + h; y++) for (let x = Math.round(x0); x < x0 + w; x++) set(x, y, c)
  }
  const circle = (cx, cy, r, c) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, c)
  }

  px.fill(0)
  rect(0, 0, size, size, bg)

  const p = size * padding
  const area = size - 2 * p
  // barras ascendentes (3)
  const bw = area * 0.16
  const gap = area * 0.12
  const x0 = p
  const baseY = size - p
  const hs = [area * 0.35, area * 0.6, area * 0.9]
  hs.forEach((h, i) => {
    const x = x0 + i * (bw + gap)
    rect(x, baseY - h, bw, h, fg)
  })
  // moeda no topo
  const r = area * 0.17
  circle(size - p - r, p + r, r, fg2)
  // cifrão simples: barra vertical dentro da moeda
  rect(size - p - r - r * 0.12, p + r * 0.35, r * 0.24, r * 1.3, bg)
  rect(size - p - r - r * 0.5, p + r * 0.55, r * 1.0, r * 0.2, bg)
  rect(size - p - r - r * 0.5, p + r * 1.25, r * 1.0, r * 0.2, bg)

  return encodePNG(size, size, px)
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192))
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512))
writeFileSync(join(outDir, 'maskable-512.png'), drawIcon(512, 0.28))
console.log('✅ Ícones gerados em public/icons/')
