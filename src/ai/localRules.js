/**
 * Nível 1 de categorização — regras locais, offline, custo zero.
 * "ifood 45,90" é resolvido em milissegundos sem gastar token.
 */
export const REGRAS = [
  { re: /ifood|rappi|restaurante|lanche|padaria|mercado|pizza|burger|pão|padaria/i, cat: 'Alimentação' },
  { re: /uber|99|gasolina|ônibus|onibus|metro|metrô|posto|estacionamento|pedágio/i, cat: 'Transporte' },
  { re: /netflix|spotify|prime|hbo|disney|globoplay|deezer|youtube premium/i, cat: 'Assinaturas' },
  { re: /academia|gym|smartfit|farmácia|farmacia|drogaria|médico|medico|consulta|dentista|remédio|remedio/i, cat: 'Saúde' },
  { re: /cinema|bar |show|role|rolé|namorada|namorado|date|balada|parque/i, cat: 'Lazer' },
  { re: /shopping|roupa|tênis|tenis|shein|renner|c&a|cne|riachuelo|zara/i, cat: 'Compras' },
  { re: /aluguel|condomínio|condominio|luz|água|agua|internet|iptu|iptú|gás|gas/i, cat: 'Moradia' },
  { re: /faculdade|curso|livro|escola|mensalidade/i, cat: 'Educação' },
  { re: /salário|salario|recebimento|pix recebido|freela/i, cat: 'Salário' },
]

const CAT_FALLBACK = 'Outros'

/** Retorna o nome da categoria pela descrição, ou null. */
export function categorizarLocal(descricao) {
  if (!descricao) return null
  for (const r of REGRAS) {
    if (r.re.test(descricao)) return r.cat
  }
  return null
}

/** Metodologia simples: palavras-chave de método de pagamento. */
export function inferirMetodo(texto) {
  const t = (texto || '').toLowerCase()
  if (/cr[ée]dito|cart[aã]o/.test(t)) return 'credito'
  if (/pix/.test(t)) return 'pix'
  if (/d[ée]bito|debito|cart[ãa]o de d[ée]bito/.test(t)) return 'debito'
  if (/dinheiro|nota|troco/.test(t)) return 'dinheiro'
  return 'desconhecido'
}
