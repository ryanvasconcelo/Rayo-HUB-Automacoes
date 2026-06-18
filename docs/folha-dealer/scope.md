# Escopo — Modulo: Contabilizacao de Folha Fortes -> Dealer

## In-Scope
- Receber dados da folha por competencia vindos de query no Fortes ERP.
- Atender inicialmente apenas Braga Veiculos.
- Trabalhar com `PayrollSourceRow` como contrato de entrada do motor.
- Aceitar fixtures para testes automatizados e conferencia de desenvolvimento.
- Usar os arquivos de contexto em `temp/braga/` como fixtures e referencias do
  primeiro ciclo, principalmente:
  - `fopag por lotacao bv.pdf`;
  - `fopag-planilha-fortes.xlsx`;
  - `querys-fopag.md`;
  - `mid-result.xlsx`;
  - `planilha-importacao-dealer.xlsm`;
  - `plano de contas.xlsx`;
  - `resultado-esperado-nbs.txt`.
- Normalizar dados de folha em contrato interno independente da origem.
- Consolidar valores por lotacao Fortes e evento Fortes.
- Aplicar de-para de lotacao Fortes para centro Dealer.
- Aplicar de-para de evento Fortes para conta contabil e natureza D/C.
- Gerar lancamentos contabeis com debito, credito, valor, historico, tipo de
  lote, competencia, centro quando aplicavel, e metadados de rastreio.
- Validar inconsistencias antes da aprovacao.
- Permitir aprovacao explicita do analista contabil.
- Exportar planilha de conferencia em XLSX.
- Exportar TXT Dealer usando o layout oficial da
  `temp/braga/planilha-importacao-dealer.xlsm`.
- Preparar o motor para receber uma origem futura NBS sem reescrever as regras
  centrais.

## Out-of-Scope
- Suporte a empresas alem de Braga Veiculos no MVP.
- Geracao ou recalculo da folha de pagamento.
- Lancamento automatico direto dentro do Dealer.
- Integracao NBS no primeiro ciclo.
- Cadastro automatico de centros, contas, eventos, ou lotacoes.
- Correcao automatica de de-para sem revisao humana.
- Persistencia em nuvem de dados sensiveis da folha.
- Parser de PDF como caminho operacional principal.
- Backend Fortes no primeiro bloco de implementacao.
- Tela de aprovacao no primeiro bloco de implementacao.
- Exportador TXT final no primeiro bloco de implementacao.

## Backlog Futuro
- Adaptador de origem NBS reutilizando o mesmo motor contabil.
- Uso de `temp/braga/resultado-esperado-nbs.txt` como fixture de validacao do
  adaptador NBS quando ele entrar no escopo.
- Suporte multiempresa com configuracoes versionadas por empresa.
- Historico de aprovacoes persistente por usuario e competencia.
- Importacao assistida dos de-para por planilha controlada.
- Comparativo entre competencias para detectar variacoes relevantes.
- Adapter PDF marcado como `fixture-only` ou `dev-only`, se for util para
  gerar fixtures de teste.
