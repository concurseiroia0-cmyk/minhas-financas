export const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parse de "YYYY-MM-DD" em Date local (meio-dia para evitar fuso) */
export const parseDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

export const toISO = (date) => {
  const d = date instanceof Date ? date : parseDate(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const addDays = (iso, n) => {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const addMonths = (iso, n) => {
  const d = parseDate(iso)
  const dia = d.getDate()
  d.setMonth(d.getMonth() + n)
  if (d.getDate() !== dia) d.setDate(0) // clamp fim de mês (31 → 30/28...)
  return toISO(d)
}

/** "2026-02" */
export const monthKey = (iso) => String(iso).slice(0, 7)

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export const fmtDate = (iso) => {
  const d = parseDate(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export const fmtDateShort = (iso) => {
  const d = parseDate(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "hoje", "ontem", "seg 03", "12 mar 2025" */
export const fmtLabel = (iso) => {
  const hj = hoje()
  if (iso === hj) return 'Hoje'
  if (iso === addDays(hj, -1)) return 'Ontem'
  if (iso === addDays(hj, 1)) return 'Amanhã'
  const d = parseDate(iso)
  if (d.getFullYear() === new Date().getFullYear()) return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`
  return fmtDate(iso)
}

/** "Fevereiro 2026" */
export const fmtMonthLabel = (mk) => {
  const [y, m] = mk.split('-').map(Number)
  return `${MESES_LONGOS[m - 1]} ${y}`
}

export const fmtWeekday = (iso) => DIAS[parseDate(iso).getDay()]

/** Dias entre hoje e a data (negativo = passou) */
export const diasAte = (iso) => {
  const a = parseDate(hoje()).getTime()
  const b = parseDate(iso).getTime()
  return Math.round((b - a) / 86400000)
}
