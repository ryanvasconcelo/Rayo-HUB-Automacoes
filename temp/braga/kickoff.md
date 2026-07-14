# Reunião de Kickoff — Contabilização Folha Fortes → Dealer/NBS

**Data:** 11 de junho  
**Participantes:** Time contábil (Sergio, Marcus, equipe Braga Veículos)  
**Objetivo:** Alinhar o processo automático de contabilização de folha de pagamento  

---

## 1. Contexto Geral do Problema

### Situação Atual (Manual)
- **Fonte de dados:** Fortes (ERP de folha de pagamento)
- **Saída Fortes:** PDF ou Excel genérico, sem breakdown por setor
- **Processo manual hoje:**
  1. Receber folha do Fortes (todos os funcionários, todos os eventos, sem lotação)
  2. Pegar a folha e separar por setor/centro de custo
  3. Para cada evento (salário, INSS, IRRF, etc.), identificar a conta contábil
  4. Montar débito/crédito manualmente
  5. Lançar no sistema contábil (Dealer ou NBS)

### Dor Principal
- Fortes **não gera relatório por lotação** — dá o total geral
- Sem lotação separada, fica impossível alocar cada evento ao seu centro de custo
- Resultado: trabalho manual e propenso a erros

### Solução
Criar um sistema que:
1. Leia a folha do Fortes **com acesso direto ao banco de dados**
2. Consolide os dados **por lotação + evento**
3. Aplique os de-paras (lotação → centro, evento → conta)
4. Gere lançamentos contábeis prontos
5. Exporte **TXT validado** para Dealer/NBS

---

## 2. Sistemas Envolvidos

| Sistema | Papel | Tipo |
|---------|-------|------|
| **Fortes** | Origem dos dados da folha | ERP RH/Folha |
| **Dealer** | Sistema contábil alvo (V1) | ERP Contábil |
| **NBS** | Sistema contábil alvo (V2) | ERP Contábil |
| **Form** | Mencionado, não é foco agora | — |

**Escopo inicial:** Braga Veículos (empresa) → Dealer (ERP)  
**Futura expansão:** Mesma metodologia para NBS e outras empresas do grupo

---

## 3. Glossário e Mapeamentos

### Lotação (Fortes) = Centro de Custo (Contábil)

A "lotação" no Fortes é exatamente o equivalente da "lotação" que a contabilidade chama de "centro de custo" ou "centro de resultado".

**Exemplos de lotações da Braga Veículos:**

| Lotação Fortes | Centro Dealer | Código |
|---|---|---|
| RECURSOS HUMANOS | Administração | 000600 |
| FINANCEIRO | Administração | 000600 |
| FISCAL | Administração | 000600 |
| TI | Administração | 000600 |
| DIRETORIA | Diretoria | 008000 |
| DEPARTAMENTO DE PEÇAS | Peças | 000500 |
| DEPT. SERVIÇOS MECANICA MATRIZ | Mecânica | 000300 |
| DEPT. FUNILARIA / PINTURA | Funilaria/Pintura | 000400 |
| DEPT. VENDAS VEICULOS | Veículos Novos | 001000 |
| DEPT. DE VENDA DIRETA MATRIZ | Venda Direta | 000101 |
| BRAGA MULTIMARCAS | Veículos Usados | 002000 |
| BRAGA VEICULOS FILIAL NOVOS | Veículos Novos Filial | 001100 |

**Nota importante:** O código a usar é a **coluna "Sigla"** do arquivo `cc dealer.pdf`, não o código interno da tabela.

### Eventos (Fortes) = Contas Contábeis

Um evento é um tipo de rubrica da folha (salário, INSS, IRRF, comissão, etc.).

**Cada evento mapeia para:**
- Uma conta contábil (ou mais de uma)
- Uma regra de débito/crédito
- Uma regra de centro de custo

**Exemplo:**

| Evento | Código | Natureza | Conta Débito | Conta Crédito | Leva Centro? |
|---|---|---|---|---|---|
| Salário Base | 011 | Provento | Salários Funcionários | Salários a Pagar | Sim |
| INSS Retido | 310 | Desconto | — | INSS a Recolher | Não |
| IRRF | 311 | Desconto | — | IRRF s/ Salários | Não |
| Comissões | 030 | Provento | Comissões p/ Vendedores | Comissões a Pagar | Sim |
| Prêmio Meta | 956 | Provento | Prêmio | Prêmio a Pagar | Sim |
| Vale Transporte | 320 | Desconto | — | Vale Transporte a Pagar | Não |
| Refeição | 947 | Desconto | — | Alimentação/Refeição | Não |
| Crédito Consignado | 100 | Desconto | — | 2.1.1.03.001 | Não |
| Empréstimo | 986 | Desconto | — | Empréstimos a Funcionários | Não |

---

## 4. Regra Crítica: Centro de Custo por Tipo de Conta

Essa é a regra-chave para evitar erros.

### Contas Patrimoniais (Grupos 1 e 2)
- **Grupo 1:** Ativo (bens e direitos)
- **Grupo 2:** Passivo (obrigações)
- **Regra:** ❌ **NÃO levam centro de custo**

### Contas de Resultado (Grupos 3+)
- **Grupo 3:** Receita
- **Grupo 4:** Custos
- **Grupo 5:** Despesa
- **Grupo 6:** Despesa (continuação)
- **Regra:** ✅ **Levam centro de custo**

### Exemplos Práticos

**Salário Base (011):**
- Débito: 6.1.1.01.002 (Salários Funcionários) — começa com 6 → **leva centro**
- Crédito: 2.1.1.01.002 (Salários a Pagar) — começa com 2 → **sem centro**

**INSS Retido (310):**
- Débito: — (não tem débito neste caso)
- Crédito: 2.1.1.04.001 (INSS a Recolher) — começa com 2 → **sem centro**

**FGTS (a recolher):**
- Crédito: 2.1.2.01.001 (FGTS a Recolher) — começa com 2 → **sem centro**

---

## 5. Fluxo de Processamento (Motor Contábil)

### Entrada
- **Empresa:** Braga Veículos
- **Competência:** ex. 04/2026
- **Data de contabilização:** ex. 30/04/2026 (último dia da competência)
- **Tipo de lote:** FP (folha de pagamento)
- **Histórico padrão:** "FOLHA DE PAGAMENTO REF 04/2026"

### Etapas do Motor

**1. Extração do Fortes**
- Query acessa o banco do Fortes
- Retorna: empregado, lotação, evento, valor, bases (INSS/FGTS)
- Consolidação por: **competência + empresa + lotação + evento = valor total**
- Resultado: tabela analítica por lotação/evento (não por empregado)

**2. De-para Lotação → Centro Dealer**
- Busca a lotação na tabela `lotacao_centro_map`
- Retorna o código de centro Dealer
- Exemplo: `DEPT. VENDAS VEICULOS` → `001000`

**3. De-para Evento → Conta Contábil**
- Busca o evento na tabela `evento_conta_map`
- Retorna:
  - Conta de débito (se aplicável)
  - Conta de crédito (se aplicável)
  - Regra de lançamento (simples, dobrada, etc.)
- Fonte: planilha `plano de contas.xlsx` aba "Eventos x Conta DEALER"

**4. Geração de Lançamentos D/C**
```
Para cada consolidado (lotação + evento):
  IF evento tem débito:
    débito = [conta_débito, centro_dealer, valor]
  IF evento tem crédito:
    crédito = [conta_crédito, centro_vazio, valor]
  
  IF conta começa com 1 ou 2:
    centro_vazio = vazio (não preenchido)
  ELSE:
    centro_vazio = centro_dealer
```

**5. Validação D = C**
- Soma de todos os débitos = soma de todos os créditos
- Se não bater, há um erro antes de exportar

**6. Aprovação do Analista Contábil**
- O analista vê uma tela com:
  - Resumo da execução
  - Totais por lotação, por evento, por centro
  - Lançamentos D/C
  - Inconsistências (se houver)
  - Preview da planilha
  - Preview do TXT
- Ações: reprovar, corrigir de-paras, ou aprovar

**7. Exportação**
- Planilha Excel de conferência (para análise)
- TXT Dealer (para importação no ERP)

---

## 6. Layout do TXT Dealer

### Campos Obrigatórios (na ordem)

| Campo | Tipo | Tamanho | Regra |
|---|---|---|---|
| Tipo | Numérico | 2 | ex: 02 |
| NR.LOTE | Alfanumérico | 8 | espaços |
| Empresa | Alfanumérico | 2 | nome empresa ou configurável |
| Filial | Numérico | 3 | ex: 001 (ou vazio se matriz) |
| Conta Débito | Numérico | 20 | sem pontuação, ex: 61101002001 |
| C.Custo Débito | Numérico | 10 | ex: 001000 ou vazio |
| Tipo Sub.Conta Débito | Numérico | 2 | — |
| Código Sub.Conta Débito | Numérico | 15 | — |
| Espaço | — | 24 | fixo |
| Conta Crédito | Numérico | 20 | sem pontuação |
| C.Custo Crédito | Numérico | 10 | ex: 001000 ou vazio |
| Tipo Sub.Conta Crédito | Numérico | 2 | — |
| Código Sub.Conta Crédito | Numérico | 15 | — |
| Nr.Doc | Alfanumérico | 8 | espaços |
| Hist.Padrao | Alfanumérico | 4 | espaços |
| Complemento | Alfanumérico | 250 | ex: evento + competência |
| Data | Numérico | 10 | dd/mm/aaaa |
| Data 2 | Alfanumérico | 10 | espaços |
| Contrapartida | Alfanumérico | 20 | espaços |
| Valor | Numérico | 18 | decimal ou inteiro |
| **TOTAL DA LINHA** | — | **152 caracteres** | ⚠️ validar sempre |

### Regra do Centro Vazio
- Contas iniciadas por 1 ou 2: **centro = vazio** (espaços no TXT posicional)
- Contas iniciadas por 3+: **centro = código Dealer**

### Empresa no TXT
- **Determinação:** Usar o nome da empresa (ex: BRAGA VEICULOS LTDA)
- **Parâmetro:** Configurável na interface/banco de dados
- **Não inventar:** Se não tiver mapeamento, deixar pendente

### Histórico Padrão
- **Formato:** FOLHA DE PAGAMENTO REF MM/AAAA
- **Exemplo:** FOLHA DE PAGAMENTO REF 04/2026
- **Dinâmico:** Competência vem da entrada do usuário

---

## 7. Decisões Arquiteturais

### Sobre Filial
- **Braga Veículos:** Lança folha apenas na **matriz**
- **Filial no TXT:** Não vai preencher filial separada (ou deixar vazio)
- **Consolidação:** Tudo entra como matriz

### Sobre Empresa
- O sistema **não tem um código fixo de empresa**
- A identificação é pelo **nome** (BRAGA VEICULOS LTDA)
- No TXT, usar o parâmetro configurável (pode ser sigla ou nome reduzido)
- **Não assumir "07"** — validar com a empresa real

### Escopo da V1
- ✅ Folha mensal: proventos, descontos, líquido, obrigações
- ⏳ Encargos patronais (INSS, FGTS sobre folha): estrutura pronta, liberar em V1.1
- ⏳ Provisões (13º, férias, encargos sobre provisões): estrutura pronta, liberar em V1.1
- **Regra:** Deixar a arquitetura pronta para ambos, mas liberar progressivamente

### Tipo de Lote
- **Sempre FP** quando for folha de pagamento
- Futuro: pode haver outros tipos (ajustes, retroativos, etc.), tratar depois

---

## 8. Validações Obrigatórias (Bloqueantes)

Antes de gerar TXT, o sistema deve bloquear se encontrar:

| Validação | Ação |
|---|---|
| Evento sem conta | ❌ Bloquear |
| Lotação sem centro | ❌ Bloquear |
| Débito ≠ Crédito | ❌ Bloquear |
| Conta 1/2 com centro preenchido | ❌ Bloquear ou limpar automaticamente |
| Conta 3+ sem centro | ❌ Bloquear |
| Centro Dealer não encontrado | ❌ Bloquear |
| Conta sem mapeamento | ❌ Bloquear |
| Competência sem dados no Fortes | ❌ Bloquear |
| Analista não aprovou | ❌ Bloquear |

---

## 9. Eventos Especiais (Confirmados)

Esses eventos têm tratamento específico (validar na planilha "Eventos x Conta DEALER"):

| Evento | Código | Tratamento |
|---|---|---|
| Salário Base | 011 | Despesa com centro |
| Comissões | 030 | Despesa com centro |
| Prêmio | 956 | Despesa com centro |
| INSS Retido | 310 | Obrigação sem centro |
| IRRF | 311 | Obrigação sem centro |
| Refeição | 947 | Desconto com centro |
| Vale Transporte | 320 | Desconto com centro |
| Crédito Consignado | 100 | Obrigação 2.1.1.03.001, sem centro |
| Quebra de Caixa | 075 | Salário ou outro (validar) |
| Líquido Negativo | 090 | Salário ou redutor (validar) |
| Amil | 302 | Assist. médica sem centro |
| Odonto | 909 | Assist. médica sem centro |
| Empréstimo | 986 | Ativo sem centro |

**Nota importante:** A planilha `plano de contas.xlsx` é a fonte de verdade para esses eventos. Qualquer dúvida, consultar ali.

---

## 10. Fluxo de Aprovação

### Tela de Conferência (Obrigatória)
O analista contábil **sempre vai precisar aprovar** antes de gerar o TXT.

**Elementos da tela:**
1. Resumo: empresa, competência, data contábil
2. Totais: folha bruta, descontos, líquido
3. Totais por lotação: quebra por centro
4. Totais por evento: quantidade de ocorrências, valor
5. Quebra D/C: lista de lançamentos
6. Inconsistências: lista de erros e alertas
7. Preview planilha: amostra das linhas
8. Preview TXT: amostra das linhas TXT
9. Botões: Reprovar / Corrigir De-paras / Aprovar

### Fluxo de Reprovação
Se reprovar ou precisar corrigir de-paras:
1. Voltar para a tela de de-paras (lotação/evento)
2. Editar manualmente se necessário
3. Re-processar (validar novamente)
4. Voltar para aprovação

---

## 11. Exportações (Saídas)

### Exportação 1: Planilha Excel de Conferência
- **Formato:** .xlsx
- **Abas sugeridas:**
  - Resumo (totais)
  - Analítico por Lotação
  - Analítico por Evento
  - Lançamentos D/C
  - Validações
  - De-paras (referência)
- **Público:** Analista contábil
- **Objetivo:** Validação manual antes do TXT

### Exportação 2: TXT Dealer
- **Formato:** .txt (posicional, 152 caracteres por linha)
- **Público:** Sistema Dealer (importação direta)
- **Objetivo:** Lançamento automático no ERP

---

## 12. Roadmap de Implementação

### Fase 1 — Motor Contábil (Sem Interface)
- Extração Fortes (queries)
- ETL e consolidação
- De-paras
- Motor contábil (lançamentos)
- Validação
- Exportação Excel + TXT

### Fase 2 — Interface Web
- React + Vite + Tailwind
- Telas básicas (seleção competência, preview, aprovação)
- Integração com backend

### Fase 3 — Persistência
- PostgreSQL
- Tabelas de mapeamento
- Histórico de execuções
- Arquivos gerados

### Fase 4 — NBS
- Reutilizar motor
- Novo layout TXT (com zeros em centro vazio)
- Novo de-para de centros

---

## 13. Próximos Passos (Imediatos)

✅ **Já temos:**
- Planilha de eventos x contas (`plano de contas.xlsx`)
- De-para de lotações (cc-dealer.pdf)
- Especificação de layout TXT (planilha-importacao-dealer.xlsm)
- Queries do Fortes (mapeadas pelo Marcelo)

⏳ **Precisamos:**
1. Um TXT Dealer validado (opcional, se disponível)
2. Confirmar valores finais de empresa/filial com o sistema Dealer
3. Iniciar a implementação do motor

---

## 14. Contatos e Referências

- **Marcelo:** Liderança do projeto, queries Fortes, conhecimento do fluxo
- **Sergio:** Time contábil, validação de lançamentos, aprovação final
- **Time Braga Veículos:** Validação de lotações e centros

**Arquivos-chave:**
- `plano de contas.xlsx` → Eventos x Conta DEALER (source of truth)
- `cc-dealer.pdf` → Centros Dealer (siglas)
- `planilha-importacao-dealer.xlsm` → Layout TXT Dealer
- `resultado-esperado-nbs.txt` → Exemplo de TXT validado (NBS, para referência)

---

## Anexo A: Estrutura de Dados Sugerida

### Tabelas Principais (PostgreSQL)

```
companies
├─ id
├─ name (ex: BRAGA VEICULOS LTDA)
├─ slug (ex: braga-veiculos)
├─ active

executions
├─ id
├─ company_id
├─ competence (ex: 04/2026)
├─ accounting_date
├─ lot_type (FP)
├─ history_text
├─ status
├─ approved_by
├─ approved_at
├─ created_at

fortes_raw_events
├─ id
├─ execution_id
├─ employee_code
├─ lotacao_fortes
├─ event_code
├─ value

fortes_consolidated_events
├─ id
├─ execution_id
├─ lotacao_fortes
├─ event_code
├─ total_value

lotacao_center_maps
├─ id
├─ company_id
├─ lotacao_fortes
├─ dealer_center_code
├─ dealer_center_name
├─ nbs_center_code
├─ active

event_account_maps
├─ id
├─ company_id
├─ event_code
├─ debit_account
├─ credit_account
├─ carries_center
├─ notes

accounting_entries
├─ id
├─ execution_id
├─ debit_account
├─ debit_center
├─ credit_account
├─ credit_center
├─ value
├─ history_text
├─ source_event_code

execution_validations
├─ id
├─ execution_id
├─ severity (error / warning)
├─ code
├─ message

generated_files
├─ id
├─ execution_id
├─ type (excel / txt)
├─ path
├─ created_at
```

---

**Documento criado:** 11 de junho  
**Última atualização:** Pós-reunião de kickoff  
**Status:** Aprovado para implementação