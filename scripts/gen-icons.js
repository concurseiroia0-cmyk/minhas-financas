// Gera public/icons/*.png sem dependências: encoder PNG mínimo (zlib do Node).
// Design: fundo preto ink + chapéu de chef amarelo com olhos (ícone do app).
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
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0 // filter none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// ---------- rasterização do chapéu de chef (espaço 200x200) ----------
const noElipse = (X, Y, cx, cy, rx, ry) => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1

/** Chapéu = união de elipses (corpo + lóbulos), recortado na base. */
function dentroDoChapeu(X, Y) {
  const dentro =
    noElipse(X, Y, 100, 95, 78, 62) || // corpo
    noElipse(X, Y, 100, 52, 52, 40) || // lóbulo central
    noElipse(X, Y, 48, 88, 40, 42) || // lóbulo esquerdo
    noElipse(X, Y, 152, 88, 40, 42) || // lóbulo direito
    noElipse(X, Y, 55, 42, 34, 32) || // superior esquerdo
    noElipse(X, Y, 145, 42, 34, 32) // superior direito
  if (!dentro) return false
  // base inferior termina em y≈158 com leve curva
  if (Y > 150) {
    const t = Math.min((Y - 150) / 8, 1)
    if (Math.abs(X - 100) > 78 * (1 - 0.25 * t * t)) return false
  }
  return true
}

function drawIcon(size, padding = 0.1) {
  const px = Buffer.alloc(size * size * 4)
  const bg = [10, 10, 12, 255] // #0a0a0c
  const amarelo = [246, 211, 83, 255] // #f6d353

  const S = size * (1 - 2 * padding)
  const off = size * padding
  const fx = (x) => ((x - off) / S) * 200
  const fy = (y) => ((y - off) / S) * 200

  // pílula (olho): retângulo + círculos nas pontas, no espaço 200x200
  const noPilula = (X, Y, x0, y0, x1, y1, r) => {
    if (X >= x0 + r && X <= x1 - r && Y >= y0 && Y <= y1) return true
    if (Y >= y0 + r && Y <= y1 - r && X >= x0 && X <= x1) return true
    return (
      noElipse(X, Y, x0 + r, y0 + r, r, r) ||
      noElipse(X, Y, x1 - r, y0 + r, r, r) ||
      noElipse(X, Y, x0 + r, y1 - r, r, r) ||
      noElipse(X, Y, x1 - r, y1 - r, r, r)
    )
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const X = fx(x + 0.5)
      const Y = fy(y + 0.5)
      const i = (y * size + x) * 4
      let c = bg
      if (dentroDoChapeu(X, Y)) c = amarelo
      // base do chapéu
      if (noPilula(X, Y, 70, 166, 130, 178, 6)) c = amarelo
      // olhos
      if (noPilula(X, Y, 76, 75, 90, 113, 7) || noPilula(X, Y, 110, 75, 124, 113, 7)) c = bg
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3]
    }
  }
  return encodePNG(size, size, px)
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192))
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512))
writeFileSync(join(outDir, 'maskable-512.png'), drawIcon(512, 0.26))
console.log('✅ Ícones chef gerados em public/icons/')
