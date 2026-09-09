const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtMoney = (v) => BRL.format(Number(v) || 0)

export const fmtHours = (h) => {
  if (h == null || !isFinite(h)) return '—'
  const horas = Math.floor(h)
  const min = Math.round((h - horas) * 60)
  if (horas === 0) return `${min}min`
  if (min === 0) return `${horas}h`
  return `${horas}h ${min}min`
}

/** Aceita "1.234,56", "1234.56", "45,90", "R$ 45" → number */
export function parseMoney(str) {
  if (typeof str === 'number') return str
  if (!str) return 0
  let s = String(str).replace(/[^\d.,-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
