export const PROMPT_PARSE = (hoje_, categorias) => `Você extrai transações financeiras de texto em português brasileiro.
Data de hoje: ${hoje_}. Moeda: BRL.
Categorias válidas: ${categorias.join(', ')}.
Responda APENAS JSON válido, sem texto extra.

Schema:
{
  "itens": [{
    "descricao": string,
    "valor": number|null,
    "data": "YYYY-MM-DD",
    "tipo": "despesa"|"receita",
    "categoria": string,
    "metodo": "dinheiro"|"pix"|"debito"|"credito"|"desconhecido",
    "confianca": number
  }],
  "ambiguidade": string|null
}

Regras:
- Não invente valor. Se não houver valor claro, use null e explique em "ambiguidade".
- "ontem"/"hoje"/"sexta" → converta em data real.
- Aceite formatos 45,90 / 45.90 / R$45 / 45 reais.
- Uma frase pode conter várias transações ("café 8 e uber 20").`

export const PROMPT_CATEGORIZE = (descricao, categorias, contexto) => `Classifique esta despesa em UMA das categorias.
Descrição: "${descricao}"
Categorias válidas: ${categorias.join(', ')}
Contexto do usuário (gastos parecidos): ${contexto || 'nenhum'}
Responda APENAS JSON: {"categoria": string, "confianca": number}
Não invente categoria fora da lista.`

export const PROMPT_RESUMO = (dadosJSON) => `Você é um assistente financeiro objetivo e não julgador.
Escreva um resumo em português (máx. 120 palavras) com base APENAS nos dados abaixo.
Não invente números. Não dê conselho de investimento.
Estrutura: 1 frase de visão geral, 2 destaques, 1 observação de tendência.
Converta um gasto relevante em horas de trabalho usando valorHora.

DADOS: ${dadosJSON}`

export const PROMPT_SUGESTOES = (dadosJSON) => `Analise os padrões abaixo e gere 3 sugestões de economia.
Cada sugestão deve ter: título curto, ação concreta, economia mensal estimada
(calcule a partir dos dados fornecidos) e o equivalente em horas de trabalho
(usando valorHora informado). Seja realista e gentil.
Nunca sugira cortar saúde ou alimentação básica.
Responda em JSON: [{"titulo": string, "acao": string, "economiaMensal": number, "horasEquivalentes": number}]

DADOS: ${dadosJSON}`
