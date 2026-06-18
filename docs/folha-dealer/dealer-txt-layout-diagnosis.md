# Diagnóstico do Layout TXT Dealer

Este documento apresenta a análise técnica da planilha original de referência (`temp/braga/planilha-importacao-dealer.xlsm`), focando em esclarecer a ambiguidade de tamanho de linha (152 caracteres exigidos vs. 453 caracteres calculados).

## 1. Evidências Encontradas na Planilha Oficial

A inspeção direta nas fórmulas da aba `Lote` usando extração programática (script `diagnose-dealer-layout.js`) revelou o seguinte comportamento nas linhas de dados (ex: linha 8):

### Colunas de Validação
* **Célula `AI7`:** Contém o texto literal `"TEM QUE SER 152"`.
* **Célula `AI8`:** Contém a fórmula `=LEN(L8)`, que calcula o comprimento exato do resultado que o usuário copiará para o TXT.

### A Coluna L (Concatenação Final)
* **Célula `L8`:** Contém a fórmula de concatenação absoluta: 
  `=N8&O8&P8&Q8&R8&S8&T8&U8&V8&W8&X8&Y8&Z8&AA8&AB8&AC8&AD8&AE8&AF8&AG8`
  Isso confirma que a coluna `L` **é de fato a linha final do TXT** que o operador copia. Não é uma visualização auxiliar.

### Colunas N a AG (Composição do Layout)
Ao analisarmos as fórmulas usadas para gerar cada campo (N:AG), os tamanhos máximos são estritamente forçados através de funções como `LEFT(..., SIZE)` e `REPT(" ", SIZE)`:

* N (Tipo): 2
* O (Nr Lote): 8
* P (Empresa): 2
* Q (Filial): 3
* R (Conta Débito): 20
* S (C.Custo Débito): 10 ou 1 (bug da planilha: `IF(A8="D",...," ")`)
* T (Tipo Sub Deb): 2 ou 1
* U (Cod Sub Deb): 15 ou 1
* V (Espaço): 24
* W (Conta Crédito): 20
* X (C.Custo Crédito): 10 ou 1
* Y (Tipo Sub Cred): 2 ou 1
* Z (Cod Sub Cred): 15 ou 1
* AA (Nr Doc): 8
* AB (Hist Padrão): 4
* AC (Complemento): **250**
* AD (Data): 10
* AE (Data 2): 10
* AF (Contrapartida): 20
* AG (Valor): 18

**Soma Total Máxima:** **453 caracteres**.

## 2. Inconsistências Críticas (Bugs da Planilha)

1. **A Farsa dos 152 Caracteres:**
   É matematicamente impossível o layout fechar em 152 caracteres se apenas o campo de "Complemento" (Coluna AC) já aplica ativamente `=LEFT(UPPER(H8)&REPT(" ",250),250)`. O rótulo "TEM QUE SER 152" é, com altíssima probabilidade, um resíduo de uma versão antiga do layout Dealer (ou de outro ERP) que nunca foi limpo quando expandiram os limites (ex: quando decidiram aceitar históricos de até 250 caracteres).

2. **O Bug da Flutuação de Tamanho:**
   Em layouts de importação posicional estrita, o tamanho da linha não pode variar. No entanto, as fórmulas das colunas condicionais (ex: Centro de Custo Débito) fazem:
   `=IF(A8="D",LEFT(UPPER(C8)&REPT(" ",10),10)," ")`
   Isso significa que, se for uma linha de Débito, a coluna tem 10 caracteres. Se for de Crédito, ela não coloca 10 espaços, coloca apenas 1 (`" "`).
   Isso faz com que linhas de Débito e Crédito tenham comprimentos diferentes gerados pela planilha (~429 caracteres na prática de cada linha, ao invés do total teórico de 453).

## 3. Conclusão do Diagnóstico

* **A coluna `L` É a linha final do TXT.** Não há macros ocultas exportando por fora.
* **O layout final NÃO TEM 152 caracteres.** A planilha real em operação gera arquivos na casa dos ~430-453 caracteres devido ao campo de histórico/complemento gigante.
* **O aviso "TEM QUE SER 152" na planilha é falso/obsoleto.**
* **Não há exportação via VBA.** A operação real pelo analista baseia-se em aplicar o filtro `LANÇAR` na coluna `J`, copiar as linhas filtradas da coluna `L` manualmente e colar no Bloco de Notas para salvar como `.txt`.

## 4. Próximos Passos Recomendados

Para implementarmos o gerador TXT oficial no sistema sem causar rejeição na ponta final:

1. Modificar o módulo isolado `dealer-txt-layout.js` para aceitar `453` como `expectedLineLength` padrão.
2. Garantir que, ao contrário do bug da planilha que gera `1` espaço quando a célula não aplica, o sistema deve preencher com a largura total de `espaços` (ex: 10 espaços para centro ausente) para manter as colunas alinhadas num layout 100% fixo.
3. Obter aprovação do cliente com um TXT de amostra gerado no formato 453 fixo.
