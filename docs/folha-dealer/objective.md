# Objetivo — Modulo: Contabilizacao de Folha Fortes -> Dealer

## A Dor
Analistas contabeis precisam transformar a folha calculada no Fortes em
lancamentos aceitos pelo Dealer. Hoje esse processo tende a misturar
extracao, consolidacao, de-para, conferencia, aprovacao e geracao de TXT em
planilhas manuais. Isso aumenta o risco de centro de custo incorreto, conta
contabil incorreta, historico divergente, lote fora do padrao, ou TXT rejeitado
no Dealer.

## A Solucao
O modulo de Contabilizacao de Folha Fortes -> Dealer busca a folha por
competencia no Fortes, consolida os valores por lotacao e evento, aplica os
de-para de centro Dealer e conta contabil, gera os lancamentos D/C, valida
inconsistencias, exige aprovacao do analista contabil, e exporta a planilha de
conferencia e o TXT Dealer no layout oficial.

O primeiro cliente suportado e `BRAGA VEICULOS LTDA`, CNPJ
`04.011.946/0001-04`. O motor deve nascer separado dos adaptadores de origem e
destino para permitir reaproveitamento futuro com NBS.

## Principios
- `/docs` e a fonte de verdade do modulo. Qualquer mudanca de regra deve
  atualizar estes documentos antes do codigo.
- O MVP atende somente Braga Veiculos.
- A fonte operacional da folha e uma query no Fortes ERP.
- O sistema deve trabalhar com `PayrollSourceRow` vindo de queries do Fortes.
- Os arquivos em `temp/braga/` sao fixtures e referencias para testes, nao a
  fonte oficial operacional.
- O motor contabil deve ser puro e reutilizavel: entrada normalizada, regras,
  validacoes e saidas estruturadas.
- A integracao Fortes e o exportador Dealer devem ficar em adaptadores.
- A aprovacao humana e obrigatoria antes da exportacao final do TXT.

## O Que Nao E
Este modulo nao calcula folha, nao substitui o Fortes, nao altera dados no
Dealer, nao administra o plano de contas, e nao deve tentar inferir
automaticamente de-para ausente. Quando faltar regra, o sistema deve bloquear a
aprovacao e apontar a inconsistencia.
