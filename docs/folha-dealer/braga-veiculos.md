# Braga Veiculos — De-para inicial

## Empresa

| Campo | Valor |
| --- | --- |
| Razao social | BRAGA VEICULOS LTDA |
| CNPJ | 04.011.946/0001-04 |
| `fortesCompanyCode` | A confirmar no banco Fortes via D1/D2 |
| `companyDisplayName` | BRAGA VEICULOS LTDA |
| `dealerCompanyField` | Parametrizavel |
| Valor observado no fixture Dealer | 07 |
| Filial Dealer | 001 |
| Competencia fixture | 04/2026 |

## Empresas Fortes candidatas

O codigo usado como exemplo em drafts antigos nao deve ser usado como candidato
da Braga.

| Codigo Fortes | Empresa | Situacao aparente |
| --- | --- | --- |
| `2025` | BRAGA VEICULOS LTDA | Aparentemente desativada |
| `2027` | BRAGA MOTORS LTDA | Aparentemente ativa |

A decisao final depende das queries de descoberta D1/D2 e da existencia da
folha da competencia.

## De-para de centros

Fonte: `temp/braga/mid-result.xlsx`, aba `5. De-Para Centro`.

As lotacoes marcadas como `Por atividade` nesta tabela ja possuem centro
Dealer definido. No MVP, esse de-para conta como regra explicita e nao bloqueia
o processamento.

| Lotacao Fortes | NBS | Dealer | Centro | Situacao |
| --- | --- | --- | --- | --- |
| RECURSOS HUMANOS | 600 | 000600 | Administração | Direta |
| FINANCEIRO | 600 | 000600 | Administração | Direta |
| FISCAL | 600 | 000600 | Administração | Direta |
| DIRETORIA | 700 | 008000 | Diretoria | Direta |
| TI | 600 | 000600 | Administração | Direta |
| DEPARTAMENTO DE PEÇAS | 500 | 000500 | Peças | Direta |
| DEPT. DE ACESSORIOS | 900 | 003100 | Acessórios | Direta |
| DEPT. SERVIÇOS MECANICA MATRIZ | 300 | 000300 | Mecânica | Direta |
| DEPT. FUNILARIA / PINTURA | 400 | 000400 | Funil./Pintura | Direta |
| DEPT. PRODUTIVOS | 300 | 000300 | Mecânica | Por atividade |
| AGENDAMENTOS | 300 | 000300 | Mecânica | Por atividade |
| DEPT. MECANICA FILIAL | 300 | 000300 | Mecânica | Direta |
| DEPT. PEÇAS FILIAL | 500 | 000500 | Peças | Direta |
| DEPTO. ACESSORIOS FILIAL | 900 | 003100 | Acessórios | Direta |
| DEPT. VENDAS VEICULOS | 100 | 001000 | Veíc. Novos | Por atividade |
| DEPT. DE VENDA DIRETA MATRIZ | 101 | 000101 | Venda Direta | Direta |
| DEPT. DE LEADS MATRIZ | 100 | 001000 | Veíc. Novos | Por atividade |
| DEPT. DE FINANCIAMENTO MATRIZ | 100 | 001000 | Veíc. Novos | Por atividade |
| BRAGA VEICULOS FILIAL NOVOS | 800 | 001100 | Veíc. Novos – Filial | Direta |
| DEPT. FINANCIAMENTO FILIAL | 800 | 001100 | Veíc. Novos – Filial | Por atividade |
| DEPTO VENDA DIRETA FILIAL | 101 | 000101 | Venda Direta | Por atividade |
| BRAGA MULTIMARCAS | 200 | 002000 | Veíc. Usados | Por atividade |
| DEPT. DE LEADS FILIAL | 800 | 001100 | Veíc. Novos – Filial | Por atividade |

## De-para de eventos e contas

Fonte: `temp/braga/plano de contas.xlsx`, aba `Eventos x Conta DEALER`.
Os totais da planilha sao fixture de `04/2026`; o de-para deve usar evento,
conta, natureza e observacao, nao o valor total.

| Evento | Descricao | Debito | Credito | Observacao |
| --- | --- | --- | --- | --- |
| **PROVENTOS** |  |  |  |  |
| 004 | Pró-labore | 6.1.1.05.002 |  | Pró-labore do diretor (conta nominal) |
| 010 | Salário-Família | 2.1.1.02.001 |  | Salário-família: débito reduz INSS a Recolher (compensável na GPS) |
| 011 | Salário-Base | 6.1.1.01.002 |  | Ger./Superv. podem ir p/ 6.1.1.01.001 |
| 030 | Comissões | 6.1.1.01.005 |  |  |
| 042 | Prêmios por Desempenho | 6.1.1.01.003 |  | Variante família prêmio (mesma conta) |
| 049 | Descanso Semanal Remunerado | 6.1.1.01.005 |  | DSR sobre comissões |
| 054 | Comissão acessórios | 6.1.1.01.005 |  | De-para contador maio/2026 |
| 055 | Comissão s/ Serv e mão de obra | 6.1.1.01.005 |  | De-para contador maio/2026 |
| 056 | Comissão s/ peças | 6.1.1.01.005 |  | De-para contador maio/2026 |
| 057 | Comissão SDR | 6.1.1.01.005 |  | De-para contador maio/2026 |
| 058 | Prêmio SDR | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 059 | Prêmio Campanha | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 067 | Crédito banco de horas | 6.1.1.01.006 |  | Contador: Dealer 6099 → Horas Extras |
| 069 | Prêmio Empenho | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 071 | Prêmio vendas digitais | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 074 | Prêmio Agregados | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 075 | Quebra de Caixa | 6.1.1.01.002 |  | Quebra de caixa — sem conta específica; sugerido Outros Salários |
| 076 | Prêmio GMAC | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 077 | Prêmio Captação | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 084 | Prêmio Meta | 6.1.1.01.003 |  | Variante de 956/998 (mesma conta) |
| 087 | Reembolso Atrasos | 6.1.1.01.002 |  | Variante conta de Atrasos (962), D |
| 090 | Líquido Negativo | 6.1.1.01.002 |  | Líquido negativo tratado como salário (orientação do cliente) |
| 094 | Comissão GMAC | 6.1.1.01.005 |  | Variante família comissão |
| 095 | Comissão Outros | 6.1.1.01.005 |  | Variante família comissão |
| 096 | Prêmio Outros | 6.1.1.01.003 |  | Variante família prêmio |
| 097 | Prêmio Meta Complementar | 6.1.1.01.003 |  | Variante Prêmio Meta |
| 098 | Comissões Garantia | 6.1.1.01.005 |  | Variante família comissão |
| 100 | Provisão Cred. Trab.- Provento | 2.1.1.03.001 |  | Conta fechada para o evento 100; por iniciar com 2, nao leva centro no TXT |
| 103 | Prêmio Outros Adic. F&I | 6.1.1.01.003 |  | Variante família prêmio |
| 104 | Prêmio Performance | 6.1.1.01.003 |  | Variante família prêmio |
| 105 | Prêmio Desafio | 6.1.1.01.003 |  | Variante família prêmio |
| 106 | Prêmio ISC | 6.1.1.01.003 |  | Variante família prêmio |
| 107 | Comissão GMAC Varejo | 6.1.1.01.005 |  | Variante Comissão GMAC |
| 108 | Prêmio GMAC Varejo | 6.1.1.01.003 |  | Variante Prêmio GMAC |
| 118 | Empréstimo Pessoal | 1.1.4.01.004 |  | Variante de Empréstimo (986), D |
| 617 | Diferença de Comissão | 6.1.1.01.005 |  | Variante família comissão |
| 949 | Diferença de Salário | 6.1.1.01.002 |  | Variante salário / dif. piso |
| 956 | Premio Meta - CCT | 6.1.1.01.003 |  | Prêmio Meta/CCT |
| 975 | Bonificação | 6.1.1.01.013 |  |  |
| 977 | Comissão venda direta | 6.1.1.01.005 |  | Variante família comissão |
| 978 | Comissão s/ pcs e mão de obra | 6.1.1.01.005 |  | De-para contador maio/2026 |
| 979 | Comissão F&I | 6.1.1.01.005 |  | Comissão F&I (remuneração do vendedor) |
| 980 | Comissão s/ vendas | 6.1.1.01.005 |  | De-para contador maio/2026 |
| 981 | Comissão Venda Leadss | 6.1.1.01.005 |  | Comissão venda leads |
| 988 | Bonificação Mes Anterior | 6.1.1.01.013 |  | Bonificação mês anterior |
| 991 | Premio Captacao Semi Novos | 6.1.1.01.003 |  | Prêmio captação seminovos |
| 993 | Prêmio Acessórios - CCT | 6.1.1.01.003 |  | De-para contador maio/2026 |
| 996 | Dif. do Piso da Categoria | 6.1.1.01.002 |  | De-para contador maio/2026 |
| 997 | Prêmio F&I | 6.1.1.01.003 |  | De-para contador maio/2026 (distinto de 979 Comissão F&I) |
| 998 | Prêmio Meta CCT - Mês anterior | 6.1.1.01.003 |  | De-para contador maio/2026 |
| **DESCONTOS / RETENÇÕES** |  |  |  |  |
| 093 | Desconto Assist. Médica Amil |  | 6.1.1.04.001 | Variante Assist. Médica Amil (302) |
| 101 | Desconto de vale |  | 6.1.1.04.006 | Variante Vale-Transporte (320) |
| 102 | Desc. pagamentos indevidos |  | 6.1.1.01.002 | Contador: Dealer 6095 → Salários e Ord. |
| 127 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Crédito do Trabalhador (consignado) — confirmar se repasse a banco |
| 302 | Assistência Médica Amil |  | 6.1.1.04.001 | Coparticipação Amil — abate despesa Assistência Médica; confirmar |
| 310 | INSS |  | 2.1.1.02.001 | INSS retido |
| 311 | IRRF |  | 2.1.3.02.001 | IRRF retido |
| 320 | Vale-Transporte |  | 6.1.1.04.006 | Coparticipação 6% — abate despesa de Vale-Transporte |
| 321 | Falta |  | 6.1.1.01.002 | Faltas — redutor de salário |
| 340 | Pensão Alimentícia - Mensal |  | 2.1.1.02.006 | Pensão alimentícia retida |
| 349 | DSR Desconto |  | 6.1.1.01.002 | DSR sobre faltas — redutor |
| 390 | Líquido Negativo Compensação |  | 6.1.1.01.002 | De-para contador maio/2026 |
| 909 | Assistencia Odontologica |  | 6.1.1.04.001 | Coparticipação odonto — sem conta odonto específica; confirmar |
| 947 | Des. Refeição |  | 6.1.1.04.003 | Coparticipação refeição |
| 958 | Desconto Refeição |  | 6.1.1.04.003 | Variante de 947 |
| 962 | Atrasos |  | 6.1.1.01.002 | Atrasos — redutor de salário |
| 963 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 964 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 965 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 966 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 967 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 968 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 969 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 970 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Consignado — confirmar |
| 985 | Descontos por danos |  | 6.1.1.01.002 | Descontos por danos — confirmar conta de recuperação |
| 986 | Emprestimo |  | 1.1.4.01.004 | Empréstimo a funcionário (recupera ativo 1.1.4.01.004) — confirmar |
| 987 | Debito de Cracha |  | 6.1.1.01.002 | Débito de crachá — confirmar conta de recuperação |
| 989 | Des. Bonificação Mes Anterior |  | 6.1.1.01.013 | Estorno de bonificação — redutor |
| 995 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Mesmo evento, código distinto (127/963–970) |
| 999 | Desc. Prêmio Meta CCT - Mês ant |  | 6.1.1.01.003 | De-para contador maio/2026 |
| **ENCARGOS PATRONAIS E PROVISÕES** |  |  |  |  |
| ENCARGO_INSS_PATRONAL | INSS Patronal 20% (DCTF 1138-01) | 6.1.1.02.001 | 2.1.1.02.001 | Analítico DCTFWeb; exclui 1082-01 (evento 310) |
| ENCARGO_RAT_FAP | GILRAT / RAT-FAP (DCTF 1646-01) | 6.1.1.02.001 | 2.1.1.02.001 | Compõe GPS / INSS a Recolher |
| ENCARGO_TERCEIROS | Terceiros Sistema S (1170/1176/1191/1196/1200) | 6.1.1.02.001 | 2.1.1.02.001 | Mesma conta INSS (diretriz DCTFWeb) |
| ENCARGO_FGTS_FOLHA | FGTS mensal 8% (tipo 11) | 6.1.1.02.002 | 2.1.1.02.002 | Analítico FGTS |
| 310 | INSS descontado do segurado (1082-01) |  | 2.1.1.02.001 | Já mapeado — não gera encargo patronal |
| PROVISAO_13 | Provisão 13º salário | 6.1.1.03.002 | 2.1.1.03.004 |  |
| PROVISAO_FERIAS | Provisão de férias (+1/3) | 6.1.1.03.001 | 2.1.1.03.001 |  |
| PROVISAO_INSS_13 | INSS s/ provisão de 13º | 6.1.1.03.004 | 2.1.1.03.005 |  |
| PROVISAO_INSS_FERIAS | INSS s/ provisão de férias | 6.1.1.03.003 | 2.1.1.03.002 |  |
| PROVISAO_FGTS_13 | FGTS s/ provisão de 13º | 6.1.1.03.006 | 2.1.1.03.006 |  |
| PROVISAO_FGTS_FERIAS | FGTS s/ provisão de férias | 6.1.1.03.005 | 2.1.1.03.003 |  |

### Fonte das provisões (Fortes)

No extract por banco, `PROV_*` vêm de `PRD`/`PRF` (coluna **Provisao** = relatório RH **Provisionar**), não de `taxa × BC-FGTS`. Encargos DCTF (`ENCARGO_*`) continuam calculados na folha mensal.

Validação de referência: `PRV.AnoMes = 202604` → total `PROV_13` = R$ 17.935,11.

## Premissas de encargos no fixture

Fonte: Analítico DCTFWeb + FGTS (Braga) e `temp/braga/mid-result.xlsx` (Parâmetros).

| Parametro | Valor | Receita DCTF/FGTS |
| --- | --- | --- |
| INSS Patronal (CPP) | 20% | 1138-01 |
| GILRAT (RAT × FAP) | 2% × 1 | 1646-01 |
| Salário Educação | 2,50% | 1170-01 |
| INCRA | 0,20% | 1176-01 |
| SENAC | 1,00% | 1191-01 |
| SESC | 1,50% | 1196-01 |
| SEBRAE | 0,60% | 1200-01 |
| Terceiros (soma) | 5,8% | — |
| FGTS | 8% | tipo 11 |
| Fator 13º | 1/12 |  |
| Fator Férias | 1/11 |  |
| Adicional 1/3 | 1/3 |  |