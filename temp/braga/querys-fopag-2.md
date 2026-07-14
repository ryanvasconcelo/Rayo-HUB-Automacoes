-- =========================================================================
-- QUERIES DE DESCOBERTA E VALIDAÇÃO DE LACUNAS FORTES -> DEALER
-- =========================================================================
-- Como a conexão via sandbox foi bloqueada, rode estas queries no seu
-- SSMS ou DBeaver apontando para o banco Fortes (AC). 
-- =========================================================================

-- 1. Código Fortes da Braga Veículos
-- A query abaixo busca confirmar qual é o EMP_Codigo da empresa BRAGA.
SELECT Codigo, Nome 
FROM EMP (NOLOCK) 
WHERE Nome LIKE '%BRAGA%' OR Nome LIKE '%VEICULOS%';

-- 2 e 3. Lotação vigente na folha e Nome da lotação
-- Pegar a folha de um ano/mês recente e identificar onde está a Lotação 
-- na tabela do Espelho da Folha (EFO) e como trazer seu nome de LOT.
-- Substitua '9252' se a query 1 provar que é outro.
DECLARE @EmpresaCodigo VARCHAR(4) = '9252';
DECLARE @AnoMes VARCHAR(6) = '202604'; -- Pode ser uma competência recente

SELECT TOP 10
    EFO.LOT_Codigo,
    LOT.Nome AS NomeLotacao,
    LOT.Descricao AS DescricaoLotacao,
    EPG.Nome AS Funcionario
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK) ON EFO.EMP_Codigo = EPG.EMP_Codigo AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN LOT (NOLOCK) ON EFO.EMP_Codigo = LOT.EMP_Codigo AND EFO.LOT_Codigo = LOT.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo;

-- 4 e 5. Join da lotação e mudança no mês
-- A regra acima via EFO.LOT_Codigo já garante a lotação processada 
-- (onde o custo recai). Confirme visualmente na consulta anterior se
-- 'NomeLotacao' ou 'DescricaoLotacao' bate com as do de-para ('DEPT. VENDAS VEICULOS').

-- 6. Chave Técnica do Evento
-- Em Fortes, EFP (Eventos Folha de Pagamento) tem eventos únicos por folha e código.
-- A validação abaixo testa se há algum funcionário com evento duplicado na mesma folha:
SELECT EFO_FOL_Seq, EFO_EPG_Codigo, EVE_Codigo, COUNT(*) as Qtde
FROM EFP (NOLOCK)
WHERE EMP_Codigo = @EmpresaCodigo
GROUP BY EFO_FOL_Seq, EFO_EPG_Codigo, EVE_Codigo
HAVING COUNT(*) > 1;
-- *Se retornar zero linhas, a chave única é "EMP_Codigo-FolhaSeq-Matricula-EventoCodigo".*

-- 11. Cargo / Função e Atividade (caso precise)
-- Se uma lotação for "Por atividade", conferir como a função vem na EFO.
SELECT TOP 10 
    EFO.CAR_Codigo, CAR.Nome AS NomeCargo, 
    EFO.FUN_Codigo, FUN.Nome AS NomeFuncao
FROM EFO (NOLOCK)
LEFT JOIN CAR (NOLOCK) ON EFO.EMP_Codigo = CAR.EMP_Codigo AND EFO.CAR_Codigo = CAR.Codigo
LEFT JOIN FUN (NOLOCK) ON EFO.EMP_Codigo = FUN.EMP_Codigo AND EFO.FUN_Codigo = FUN.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo;

