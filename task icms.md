RAYO - ICMS
Adicionar validação de estrutura de planilha, se der erro, avisar o usuario - vamos verificar se a planilha tem todas as colunas que precisamos, se ela nao tiver, vamos avisar o usuario e nao vamos continuar com o processamento
Trocar a cor da celula alteradas de vermelho pra verde claro
Gerar relatório do ICMS - vamos disponibilizar o relatorio pra download em pdf
Link de descrição NCM e CFOP: vamos fazer uma comparacao entre a descrição do livrão e descrição de NCM e CFOP que vem do e-Auditoria - exibindo no relatorio elas e exibindo com amarelo claro na planilha as que forem diferentes
No xlsx gerado como output vamos trazer a coluna de descrição do e-Auditoria ao lado da coluna M "nome do produto" que é a descricao do CFOP
Base de calculo com casas decimais: nao estamos trazendo o output final com as bases de calculo que foram alteradas com as casas decimais
Coluna adicional com CST antigo: vamos adicionar uma coluna no output final que mostre o CST antigo ao lado da coluna que atualmente mostra os CSTs que foram mantidos e os que foram alterados

Todas operações que nao sao a aquisição de mercadoria pra venda + transferencias, alterar o cst 90 zerar base calculo, zerar aliquota e ICMS: ou seja, quando fizermos a alteracao do CST temos que verificar se iremos alterar tbm a aliquota, a base de calculo e o valor do ICMS
Valor do ICMS = base de calculo * aliquota
Como chegar no valor da aliquota: tabela de aliquota - fonte: https://www.taxgroup.com.br/intelligence/tabela-icms-2026-fique-por-dentro-das-aliquotas-estaduais-atualizadas/
Ele deve reconhecer CFOP que correspondem a:
- transferencias
- Uso consumo
- Amostra gratis
- Bonificações interestaduais
- Comadatos
- Outras entradas

A descricao dos produtos deve ser usada como chave composta com NCM, pois as vezes um NCM tem diversas descricoes
Itens ST - vc nao toma credito de um NCM que nao foi pago credito - substituição tributária - 
CST ICMS - base de ICMS - aliquota, e o valor do ICMS (base do icms * aliquota)

links de consulta permanente para base de conhecimento do auditor de icms
D. 6108/22 https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=84be7172-451e-4ca0-802e-1a0303e5f0b2

D. 6215/23 https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=711873af-84a9-4f5a-93d9-e50ee7f947c3

CFOP https://www.sefaz.pe.gov.br/legislacao/tributaria/documents/legislacao/tabelas/cfop.htm

tabela de aliquota: https://www.taxgroup.com.br/intelligence/tabela-icms-2026-fique-por-dentro-das-aliquotas-estaduais-atualizadas/