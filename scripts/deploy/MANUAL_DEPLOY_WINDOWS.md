# RESUMO DETALHADO - REUNIÃO BI

**Data:** 16/06/2026

## 3. PONTOS DE MELHORIA 🔧

### 3.1 Giro de Estoque (CRÍTICO)
- **Problema:** O cálculo atual está trazendo PA (Produto Acabado), que "sai" do estoque, distorcendo o giro, pois a maior parte do saldo está nos outros movimentos
- **Correção esperada:** O giro deve considerar **todas as movimentações internas de todos os tipos** (matéria-prima, semi-acabados, etc.), **com exceção** ao PA.
- **Fonte de dados:** Usar a **SD3** para listar tudo que foi movimentado no mês e definir o giro corretamente.
- **Ação adicional:** Verificar a matéria-prima dentro dessas movimentações.

### 3.2 Dias de Estoque
- **Problema:** Card exibindo "34,09 Mil" dias de estoque — valor sem utilidade analítica de acordo com o time Venttos.
- **Solicitação:** **REMOVER** a métrica do painel (solicitado explicitamente).

### 3.3 Produtos Inativos no Saldo
- **Problema:** Verificar possível contorno.

### 3.4 Campo B1_TIPO (Tipo de Produto)
- **Problema:** O tipo de produto não está disponível como filtro nem visualização.
- **Solicitação:** Incluir `B1_TIPO` (do cadastro SB1) como **filtro** e como **coluna** na view de detalhes da tela de estoque.

---

## 4. NOVAS SOLICITAÇÕES 🆕

#### 4.1 View Faturamento x Custo por Cliente
- **Descrição:** Adicionar custo segregado por cliente da tela inicial no card de faturamento X cliente.
- **Base atual:** Já existem "Custo Total por Cliente" e "Custo Total por Produto" na página Resumo; falta a comparação direta faturamento x custo por cliente.

#### 4.2 Valor Vendido em Reais
- **Descrição:** Incluir o valor vendido **em R$** em vez de apenas quantidade nas visualizações da tela inicial.
- **Impacto:** Afeta as tabelas de detalhes da página Estoque (atualmente exibindo Qtde Vendida em unidades).
- **Critério de aceite:** Coluna de valor em R$ corretamente totalizada.

#### 4.3 Filtro e View B1_TIPO
- **Descrição:** Adicionar o campo `B1_TIPO` do cadastro como filtro e na visualização.
- **Implementação:** Já contemplado no join com SB1010 nas queries B9 e SD3.

#### 4.4 Última Entrada e Último Movimento do Produto
- **Descrição:** Adicionar colunas com a data da **última entrada** e do **último movimento** de cada produto.
- **Fonte:** Disponível na **B2** (e B9_DATA para referência de fechamento).
- **Critério de aceite:** Datas preenchidas para todos os produtos com estoque; ordenação por data funcional.

#### 4.5 Filtro de Filiais
- **Descrição:** Restringir as queries às filiais válidas.
- **Implementação:** Adicionar `AND FILIAL IN ('01','02','03','04','05','06')` ao final das queries de **B2**, **B9** e **SD3**.