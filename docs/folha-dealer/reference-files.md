# Arquivos de referencia — Braga Veiculos

Os arquivos em `temp/braga/` sao fixtures e referencias do primeiro ciclo do
modulo. Eles nao sao a fonte operacional oficial e nao devem ser alterados pelo
motor.

Fonte operacional oficial: query no Fortes ERP, normalizada para
`PayrollSourceRow`.

| Arquivo | Uso no modulo |
| --- | --- |
| `querys-fopag.md` | Inventario inicial das queries Fortes ja conhecidas. Usar para desenhar o adapter Fortes futuro e para identificar lacunas de banco. |
| `fopag por lotacao bv.pdf` | Fixture/referencia de teste com lotacao, empregado, evento, provento, desconto, FGTS, liquido, BC-INSS, e BC-FGTS. Nao e fonte operacional oficial. |
| `fopag-planilha-fortes.xlsx` | Resumo geral Fortes por tipo de folha e competencia. Deve ser usado como conferencia, nao como fonte unica por lotacao. |
| `mid-result.xlsx` | Modelo manual de conferencia, de-para, consolidado por centro, eventos x conta, lancamento contabil, e consolidado geral. |
| `planilha-importacao-dealer.xlsm` | Layout oficial do TXT Dealer e template de lote. |
| `plano de contas.xlsx` | De-para inicial de eventos da folha para contas contabeis Dealer. |
| `plano de contas.pdf` | Plano de contas completo da Braga Veiculos. |
| `cc - NBS.pdf` | Centros NBS, util para o adaptador NBS futuro e para conferir codigos reduzidos. |
| `cc dealer.pdf` | Centros Dealer. O PDF nao apresentou texto extraivel nesta sessao. |
| `de-para lotacao braga veiculos.jpeg` | Anotacao manual NBS -> Dealer para Braga Veiculos GM. |
| `lotacao braga motos.jpeg` | Anotacao manual de outra empresa/unidade. Fora do MVP Braga Veiculos. |
| `resultado-esperado-nbs.txt` | Saida esperada do fluxo NBS futuro. Fora da exportacao Dealer do MVP. |

## Competencia fixture

O fixture principal representa `04/2026` para `BRAGA VEICULOS LTDA`, CNPJ
`04.011.946/0001-04`.

O fixture `fopag por lotacao bv.pdf` contem 23 lotacoes, que batem com as 23
linhas do de-para de centro em `mid-result.xlsx`.

Qualquer adapter para ler PDF deve ser marcado como `fixture-only` ou
`dev-only`.
