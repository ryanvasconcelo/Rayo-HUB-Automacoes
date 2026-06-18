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
| 049 | Descanso Semanal Remunerado | 6.1.1.01.005 |  | DSR sobre comissões |
| 075 | Quebra de Caixa | 6.1.1.01.002 |  | Quebra de caixa — sem conta específica; sugerido Outros Salários |
| 090 | Líquido Negativo | 6.1.1.01.002 |  | Líquido negativo tratado como salário (orientação do cliente) |
| 100 | Provisão Cred. Trab.- Provento | 2.1.1.03.001 |  | Conta fechada para o evento 100; por iniciar com 2, nao leva centro no TXT |
| 956 | Premio Meta - CCT | 6.1.1.01.003 |  | Prêmio Meta/CCT |
| 975 | Bonificação | 6.1.1.01.013 |  |  |
| 979 | Comissão F&I | 6.1.1.01.005 |  | Comissão F&I (remuneração do vendedor) |
| 981 | Comissão Venda Leadss | 6.1.1.01.005 |  | Comissão venda leads |
| 988 | Bonificação Mes Anterior | 6.1.1.01.013 |  | Bonificação mês anterior |
| 991 | Premio Captacao Semi Novos | 6.1.1.01.003 |  | Prêmio captação seminovos |
| **DESCONTOS / RETENÇÕES** |  |  |  |  |
| 127 | Consignado Crédito Trabalhador |  | 2.1.1.02.007 | Crédito do Trabalhador (consignado) — confirmar se repasse a banco |
| 302 | Assistência Médica Amil |  | 6.1.1.04.001 | Coparticipação Amil — abate despesa Assistência Médica; confirmar |
| 310 | INSS |  | 2.1.1.02.001 | INSS retido |
| 311 | IRRF |  | 2.1.3.02.001 | IRRF retido |
| 320 | Vale-Transporte |  | 6.1.1.04.006 | Coparticipação 6% — abate despesa de Vale-Transporte |
| 321 | Falta |  | 6.1.1.01.002 | Faltas — redutor de salário |
| 340 | Pensão Alimentícia - Mensal |  | 2.1.1.02.006 | Pensão alimentícia retida |
| 349 | DSR Desconto |  | 6.1.1.01.002 | DSR sobre faltas — redutor |
| 909 | Assistencia Odontologica |  | 6.1.1.04.001 | Coparticipação odonto — sem conta odonto específica; confirmar |
| 947 | Des. Refeição |  | 6.1.1.04.003 | Coparticipação refeição |
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
| **ENCARGOS PATRONAIS E PROVISÕES** |  |  |  |  |
| ENCARGO_INSS_PATRONAL | INSS Patronal (20%) | 6.1.1.02.001 | 2.1.1.02.001 |  |
| ENCARGO_RAT_FAP | RAT/FAP | 6.1.1.02.001 | 2.1.1.02.001 | RAT compõe a GPS |
| ENCARGO_TERCEIROS | Terceiros (Sistema S) | 6.1.1.02.005 | 2.1.1.02.003 | Confirmar conta para SESC/SENAC/etc. |
| ENCARGO_FGTS_FOLHA | FGTS s/ folha (8%) | 6.1.1.02.002 | 2.1.1.02.002 |  |
| PROVISAO_13 | Provisão 13º salário | 6.1.1.03.002 | 2.1.1.03.004 |  |
| PROVISAO_FERIAS | Provisão de férias (+1/3) | 6.1.1.03.001 | 2.1.1.03.001 |  |
| PROVISAO_INSS_13 | INSS s/ provisão de 13º | 6.1.1.03.004 | 2.1.1.03.005 |  |
| PROVISAO_INSS_FERIAS | INSS s/ provisão de férias | 6.1.1.03.003 | 2.1.1.03.002 |  |
| PROVISAO_FGTS_13 | FGTS s/ provisão de 13º | 6.1.1.03.006 | 2.1.1.03.006 |  |
| PROVISAO_FGTS_FERIAS | FGTS s/ provisão de férias | 6.1.1.03.005 | 2.1.1.03.003 |  |

## Premissas de encargos no fixture

Fonte: `temp/braga/mid-result.xlsx`, aba `Parâmetros`.

| Parametro | Valor |
| --- | --- |
| INSS Patronal (CPP) | 20% |
| RAT (SAT) | 2% |
| FAP | 1 |
| Terceiros (Sistema S) | 5,8% |
| FGTS | 8% |
| Fator 13º | 1/12 |
| Fator Férias | 1/11 |
| Adicional 1/3 | 1/3 |
