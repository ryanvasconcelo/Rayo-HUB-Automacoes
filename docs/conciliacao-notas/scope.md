# Escopo — Módulo: Conciliação de Notas (NOVO)

## In-Scope
- Upload de arquivos CSV/Excel do Razão Contábil (NBS) e Relatório Financeiro (Sifin).
- Conciliação automática via cruzamento pelo **Número da Nota**.
- Painel de resultados com status: Conciliado, Investigar, Inconsistência, Sem Financeiro.
- Exportação dos resultados em XLSX para trilha de auditoria.

## Out-of-Scope
- Modificação dos balanços e balancetes dos clientes.
- Conexão nativa ODBC à base de dados para leitura contínua (MVP exige arquivo).

## Backlog Futuro
- Suporte a múltiplos meses (anterior / atual / posterior) para cobrir notas de competências diferentes.
- Sugestão inteligente de regularizações para notas órfãs via LLM interno.
