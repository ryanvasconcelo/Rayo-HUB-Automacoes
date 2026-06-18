# Checklist de Validação Dealer

Utilize este checklist para garantir que todos os passos e validações foram realizados com sucesso durante os testes e importação para o Dealer.

## 1. Antes de Importar no Dealer
- [ ] O status do lote no sistema está como **READY**.
- [ ] **Débito = Crédito** nos totais processados.
- [ ] **Diferença = R$ 0,00**.
- [ ] A **Data contábil** está correta.
- [ ] A **Empresa Dealer** está informada e correta.
- [ ] A **Filial Dealer** está informada e correta.
- [ ] O **Excel de conferência** foi baixado e analisado.
- [ ] O botão do TXT foi liberado e o **TXT gerado somente após a aprovação** do lote.
- [ ] O arquivo TXT foi **validado pelo script de verificação** (sem erros reportados).
- [ ] O TXT não contém valores indevidos (`undefined`, `null` ou `Invalid Date`).
- [ ] Todas as linhas do arquivo TXT possuem exatamente **453 caracteres**.

## 2. Teste Pequeno de Importação
- [ ] Arquivo `dealer-test-import.txt` importado no Dealer.
- [ ] O Dealer **aceitou o arquivo** sem erros de layout.
- [ ] O Dealer mostrou a **prévia** da importação corretamente.
- [ ] **Débito = Crédito** nos valores da prévia (ex: R$ 10,00 / R$ 10,00).
- [ ] Os lançamentos do teste puderam ser **excluídos/cancelados** no Dealer se necessário.

## 3. Teste Completo (Real)
- [ ] Arquivo TXT completo da folha foi importado no Dealer.
- [ ] Os totais informados no Dealer bateram perfeitamente com os do **Excel de conferência**.
- [ ] A **quantidade de linhas** importadas está igual ao número esperado no arquivo.
- [ ] O **histórico** dos lançamentos foi importado sem truncamento ou falha.
- [ ] As **datas contábeis** de todos os lançamentos estão corretas.
- [ ] Foi feita a **validação com o analista contábil** responsável pela aprovação.
