# Plano de implementacao — Folha Fortes -> Dealer

## Estrutura proposta

```text
docs/folha-dealer/
  objective.md
  scope.md
  business-rules.md
  data-contracts.md
  fortes-query-map.md
  braga-veiculos.md
  reference-files.md
  dealer-txt-layout.md
  implementation-plan.md

apps/rayo/src/lib/folha-dealer/
  contracts.js
  braga-veiculos.config.js
  braga-veiculos.fixtures.js
  fortes-normalizer.js
  payroll-consolidator.js
  center-mapper.js
  account-mapper.js
  journal-builder.js
  folha-validator.js

apps/rayo/tests/
  folha-dealer-engine.test.js
```

Itens futuros, fora do primeiro bloco:

```text
apps/rayo/src/lib/folha-dealer/
  fortes-pdf-fixture-adapter.js
  conference-xlsx-exporter.js
  dealer-txt-exporter.js

apps/rayo/src/hooks/
  useFolhaDealer.js

apps/rayo/src/pages/
  FolhaDealerPage.jsx

apps/rayo-server/folha-dealer/
  fortes-client.js
  routes.js
```

Qualquer adapter de PDF deve ser `fixture-only` ou `dev-only`; ele nao e o
caminho operacional principal.

O motor deve permanecer em `apps/rayo/src/lib/folha-dealer/` sem dependencia de
React. Isso permite testes unitarios e futura extracao para `packages/` quando
NBS virar um segundo consumidor real.

## Primeiro bloco de implementacao

O primeiro bloco entrega somente o motor puro testavel em
`apps/rayo/src/lib/folha-dealer/`.

1. Criar contratos JS/TS do dominio.
2. Criar fixtures da Braga Veiculos.
3. Implementar `fortes-normalizer.js` para receber linhas ja consultadas e
   normaliza-las para `PayrollSourceRow`, sem executar SQL.
4. Implementar consolidador por lotacao e evento.
5. Aplicar de-para de centro.
6. Aplicar de-para de conta.
7. Gerar lancamentos D/C em memoria.
8. Executar validacoes bloqueantes.
9. Cobrir o motor com testes unitarios.

Nao implementar neste bloco:

- Tela.
- Exportador TXT final.
- Backend Fortes.
- Parser PDF como caminho operacional.
- Descoberta de queries faltantes no banco.

A descoberta real da empresa e da lotacao deve ser validada via
`discovery_fortes.sql`, usando as queries D1/D2 e a existencia da folha da
competencia. Isso nao bloqueia o motor puro: ele continua recebendo
`PayrollSourceRow` ja normalizado.

## Ordem futura de implementacao

1. Implementar Excel de conferencia seguindo a estrutura de `mid-result.xlsx`.
2. Implementar aprovacao do analista contabil.
3. Resolver as ambiguidades documentadas em `dealer-txt-layout.md`.
4. Implementar `dealer-txt-exporter.js` com teste de saida oficial.
5. Integrar a busca Fortes real no `rayo-server`, se a origem exigir backend.
6. Adicionar a tela `FolhaDealerPage.jsx` e o hook `useFolhaDealer.js`.
7. Adicionar a rota no `App.jsx` e o card de acesso na `HomePage.jsx`.

## Testes obrigatorios do primeiro bloco

- Consolida duas linhas da mesma lotacao e evento em um item.
- Mantem separados eventos diferentes na mesma lotacao.
- Mantem separadas lotacoes diferentes no mesmo evento.
- Bloqueia ou rejeita linha de origem sem lotacao antes da consolidacao.
- Bloqueia evento sem de-para de conta.
- Bloqueia lotacao sem de-para de centro quando a conta exige centro.
- Remove ou esvazia centro para contas iniciadas por `1` ou `2`.
- Exige centro para contas iniciadas por `3` em diante.
- Bloqueia evento `100` se a conta nao for `2.1.1.03.001`.
- Garante que evento `100` nao leva centro por usar conta iniciada por `2`.
- Bloqueia lancamentos desbalanceados.
- Gera historico `FOLHA DE PAGAMENTO REF MM/AAAA`.
- Usa tipo de lote `FP`.

## Testes obrigatorios futuros

- Bloqueia TXT enquanto houver `DEALER_LAYOUT_AMBIGUOUS`.
