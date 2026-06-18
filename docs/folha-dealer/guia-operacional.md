# Guia Operacional: Importação Folha Fortes → Dealer

Este guia passo a passo destina-se a orientar o analista contábil na validação e importação da folha de pagamento do Fortes para o Dealer.

## Passo a Passo

1. **Acessar a Tela de Integração**
   Abra a aplicação e acesse o menu **Folha → Dealer**.

2. **Selecionar Origem de Dados**
   Escolha a opção **CSV Fortes** como fonte da importação.

3. **Informar Parâmetros Iniciais**
   Preencha os campos com a **empresa** e a **competência** (mês/ano) correspondentes à folha.

4. **Anexar o Arquivo CSV**
   Selecione e anexe o relatório CSV da folha, previamente extraído do sistema Fortes.

5. **Processar o Arquivo**
   Clique em **Importar e Validar** para iniciar o processamento das regras contábeis.

6. **Conferir Resultados em Tela**
   Verifique no resumo do sistema se os seguintes critérios estão corretos:
   - Status da integração está como **READY**.
   - O valor de **Débito** é exatamente igual ao valor de **Crédito**.
   - O campo **Diferença** apresenta o valor igual a **zero (R$ 0,00)**.
   - Não há avisos de **pendências bloqueantes** (ex: contas ou centros de custos não mapeados).

7. **Baixar Planilha de Conferência**
   Faça o download do Excel de conferência para análise e arquivamento, caso necessário.

8. **Aprovar o Lote**
   Estando tudo correto, clique no botão para **Aprovar lote**.

9. **Gerar e Baixar o Arquivo TXT**
   Após a aprovação, o botão para gerar o arquivo TXT será liberado. Baixe o arquivo gerado (ele conterá todas as linhas prontas para o Dealer).

10. **Importar no Sistema Dealer**
    Abra o módulo contábil no Dealer e realize a importação do TXT gerado.

11. **Conferência Final no Dealer**
    Após a importação, confira diretamente no Dealer se os dados batem:
    - Quantidade de lançamentos importados.
    - Total de Débito e Total de Crédito.
    - Diferença (deve estar zerada).
    - Data contábil.
    - Identificação da Empresa e Filial.
    - Contas contábeis e centros de custo atribuídos.
