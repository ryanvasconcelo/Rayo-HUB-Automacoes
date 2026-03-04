# Objetivo — Módulo: Auditor de Estoque

## A Dor
O gestor contábil da Braga Moto Rey mantém dois registros paralelos do mesmo estoque: uma planilha de **Estoque de Motos Novas** (com 12 abas mensais) e um **Razão Contábil**. A partir de julho de 2025, o saldo total do Razão deixou de bater com o saldo do Estoque físico. Identificar manualmente, linha a linha, qual chassi está causando a diferença é inviável: são centenas de motos distribuídas em dezenas de lançamentos.

## A Solução
O módulo faz o cruzamento automático entre os dois arquivos usando os **últimos 7 caracteres do chassi** como chave (ex: `95V6N1G2STM004316` → `M004316`). Para cada mês, ele reconstrói o saldo acumulado do Razão e compara chassi a chassi com o que está na aba do Estoque, classificando cada itemem: **Conciliado**, **Saído no Razão** (mais comum causa de divergência), **Só no Estoque**, **Só no Razão** ou **Valor Divergente**.

O resultado é um painel mensal clicável com drilldown por chassi — o contador enxerga em segundos qual moto está causando o problema.

## O Que Não É
- Não substitui o controle de estoque no ERP.
- Não modifica nem exporta o Razão ou o arquivo de Estoque.
- Não faz integração com sistemas externos ou banco de dados em nuvem.
- Não valida notas fiscais de entrada/saída.
