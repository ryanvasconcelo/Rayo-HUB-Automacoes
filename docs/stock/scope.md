# Escopo — Módulo: Auditor de Estoque

## In-Scope (MVP)
- Upload do arquivo de **Estoque de Motos Novas** (.xls — 12 abas mensais) via drag-and-drop
- Upload do arquivo de **Razão Contábil de Estoque** (.xlsx — lançamentos Jan–Dez) via drag-and-drop
- Extração automática do chassi: últimos 7 caracteres (ex: `M004316`)
- Reconstrução do saldo acumulado do Razão mês a mês (débitos − créditos)
- Painel de **resumo mensal**: Total Estoque × Total Razão × Delta × Status por mês
- **Drilldown por chassi**: cada moto classificada com status e lançamentos do Razão
- Classificação: Conciliado | Saído no Razão | Só no Estoque | Só no Razão | Valor Divergente
- Filtro de status no drilldown
- **Exportação XLSX** do drilldown do mês selecionado
- Processamento 100% local no browser (sem envio de dados para servidor)

## Out-of-Scope
- Integração direta com ERP ou NBS
- Histórico de análises ou persistência de dados
- Modificação dos arquivos de Estoque ou Razão
- Suporte a múltiplos Razões ou empresas simultâneas
- Validação de notas fiscais de entrada ou saída

## Backlog Futuro
- Exportar relatório PDF com resumo executivo
- Histórico comparativo de divergências entre execuções
- Suporte a outros formatos de exportação do Razão (outros ERPs)
- Detecção automática de padrões recorrentes de discrepância
