/** valorHora = rendaLiquida / (diasTrabalhados * horasPorDia) */
export function valorHora(profile) {
  if (!profile?.rendaLiquida) return 0
  const horas = (profile.diasTrabalhados || 0) * (profile.horasPorDia || 0)
  return horas > 0 ? profile.rendaLiquida / horas : 0
}

/** Quantas horas (e dias) de trabalho um preço representa. */
export function horasPara(preco, profile) {
  const vh = valorHora(profile)
  if (vh <= 0) return null
  const horas = preco / vh
  return { horas, dias: horas / (profile?.horasPorDia || 8) }
}
