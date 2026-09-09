# 💰 Minhas Finanças — PWA offline-first

**🔗 App publicado: https://concurseiroia0-cmyk.github.io/minhas-financas/**

Controle financeiro pessoal que **funciona 100% offline** e **salva tudo no próprio dispositivo** (IndexedDB — sem servidor, sem banco de dados). A IA é gratuita (OpenRouter `:free` + NVIDIA NIM com fallback) e **apenas sugere** — o usuário sempre confirma antes de salvar.

## Destaques

- 🏦 **Multi-banco**: cadastre Nubank, Banco do Brasil, etc. com quanto tem guardado em cada; veja saldo, gasto do mês e faturas por banco; transfira entre eles sem contar como gasto
- ✍️ **QuickAdd por texto**: `"ifood 45,90"` resolve offline por regras locais; frases complexas vão para a IA gratuita
- 🕐 **Valor da hora**: tudo convertido em horas/dias de trabalho
- 📲 **Instalável no celular**: PWA com service worker — abre como app, funciona sem internet
- 🔐 **Chaves de IA via secrets** do GitHub (nunca versionadas) e injeção no build pelo Actions

## Stack

React 19 · Vite 7 · Tailwind CSS 4 · Dexie (IndexedDB) · Zustand · Recharts · vite-plugin-pwa (Workbox)

## Rodar

```bash
npm install
cp .env.example .env.local   # e preencha as chaves
npm run dev        # desenvolvimento
npm run build      # produção (gera service worker + manifest)
npm run preview    # servir o build
node scripts/gen-icons.js   # regenerar ícones PWA
```

### Deploy

O push em `main` dispara o GitHub Actions, que builda com os secrets `VITE_OPENROUTER_KEY_B64` / `VITE_NVIDIA_KEY_B64` e publica na branch `gh-pages` (GitHub Pages). Para apontar ao seu repositório, ajuste o nome em `.github/workflows/deploy.yml` não é preciso — o `peaceiris/actions-gh-pages` usa o token padrão do repo.

Na primeira abertura, escolha **Começar** (com seus bancos) ou **Explorar com dados de exemplo** (~100 dias de transações fictícias).

## Telas

| Rota | Conteúdo |
|---|---|
| `/` | Dashboard: **bancos com saldo**, gasto do mês (em horas de trabalho), donut por categoria, faturas, recorrentes próximas |
| `/bancos` | **Multi-banco**: guardado/saldo/gasto por banco, faturas vinculadas, transferência entre bancos |
| `/quickadd` | Texto livre → transação (“ifood 45,90”, “uber 20,50 ontem e mercado 187,30”) |
| `/lancamentos` | Lista agrupada por dia, busca, filtros, edição |
| `/cartoes` | Fatura aberta/futura, limite, pagamento (transferência), compra parcelada |
| `/recorrentes` | Aluguel, assinaturas… gera lançamentos automaticamente |
| `/horas` | Preço → horas e dias de trabalho |
| `/relatorios` | Evolução 6 meses, resumo semanal, sugestões de economia |
| `/config` | Chaves de IA (OpenRouter/NVIDIA), tema, categorias, backup JSON |

## Regras de negócio (código, nunca IA)

- `valorHora = rendaLiquida / (diasTrabalhados × horasPorDia)` — `src/core/hourlyRate.js`
- **Compra no crédito é a despesa na data da compra.** O **pagamento da fatura é transferência** (`tipo: 'transferencia'`) e não entra nos totais de gasto — `src/core/invoice.js`
- Parcelamento gera N lançamentos mensais com `(i/N)` — `src/core/recurrence.js`
- Recorrências geram lançamentos sem duplicar (chave `recurrenceId + data`)

## Pipeline de IA (3 níveis)

```
Texto → [1] Regras locais (regex, offline, custo zero)
      → [2] Histórico do usuário (descrição já classificada 3×)
      → [3] IA (OpenRouter → NVIDIA, fallback automático, cache por hash)
      → sem internet? fila (aiQueue) processa quando voltar
      → tela de CONFIRMAÇÃO → usuário aprova → salva
```

**A IA nunca grava direto no banco.** Confiança < 0,7 destaca os campos em amarelo para revisão.

### IA sem chave? Tudo continua funcionando

| Função | Com chave | Sem chave |
|---|---|---|
| Parse de texto | IA para frases complexas | Regras locais + histórico |
| Categorização | IA no nível 3 | Dicionário local + histórico |
| Resumo semanal | IA redige o texto | Texto gerado localmente |
| Sugestões de economia | IA analisa padrões | Heurísticas locais (20% da categoria, recorrentes, meta 5%) |

Chamadas de IA têm timeout de 15s, fallback entre provedores e `response_format: json_object`. O service worker usa `NetworkOnly` para as APIs de IA — resposta de rede nunca é servida como dado local.

## Backup

Configurações → **Exportar backup** gera JSON com todos os dados; **Importar** restaura. Os dados vivem no IndexedDB do navegador — exporte periodicamente.
