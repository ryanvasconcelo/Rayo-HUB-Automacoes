import mssql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    user: 'biprojecont',
    password: 'proj@#2087!',
    server: '192.168.0.5',
    port: 1433,
    database: 'AC',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    requestTimeout: 300000
};

const query = `
DECLARE @EmpresaCodigo VARCHAR(4) = '9252';
DECLARE @Ano INT = 2026;
DECLARE @Mes INT = 4;
DECLARE @AnoMes VARCHAR(6);
SET @AnoMes = CAST(@Ano AS VARCHAR(4)) + RIGHT('00' + CAST(@Mes AS VARCHAR(2)), 2);

DECLARE @FolhaSeq INT = (
    SELECT TOP 1 FOL.Seq
    FROM FOL (NOLOCK)
    INNER JOIN FPG (NOLOCK)
        ON FOL.EMP_Codigo = FPG.EMP_Codigo
       AND FOL.Seq = FPG.FOL_Seq
    WHERE FOL.EMP_Codigo = @EmpresaCodigo
      AND FPG.AnoMes = @AnoMes
      AND FOL.Folha = 2
      AND FPG.Tipo IN (1, 4)
    ORDER BY FOL.Seq DESC
);

SELECT
    EFO.EMP_Codigo AS companyId,
    EMP.Nome AS companyName,
    @AnoMes AS competence,
    EPG.Codigo AS employeeId,
    EPG.Nome AS employeeName,
    EFO.FOL_Seq AS sourcePayrollId,
    EFP.EVE_Codigo AS eventCode,
    EVE.NomeApr AS eventName,
    EVE.ProvDesc AS ProvDesc,
    CASE
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('0', '1') THEN 'PROVENTO'
        WHEN CAST(EVE.ProvDesc AS VARCHAR(10)) IN ('2', '3') THEN 'DESCONTO'
        ELSE 'NAO_CLASSIFICADO'
    END AS TipoRegistro,
    CAST(ROUND(EFP.Valor * 100, 0) AS INT) AS amountCents,
    EFP.Referencia AS sourceReference,
    LOT.Codigo AS lotacaoCode,
    LOT.Nome AS lotacaoName
FROM EFO (NOLOCK)
INNER JOIN EPG (NOLOCK)
    ON EFO.EMP_Codigo = EPG.EMP_Codigo
   AND EFO.EPG_Codigo = EPG.Codigo
LEFT JOIN EMP (NOLOCK)
    ON EFO.EMP_Codigo = EMP.Codigo
LEFT JOIN EFP (NOLOCK)
    ON EFO.EMP_Codigo = EFP.EMP_Codigo
   AND EFO.FOL_Seq = EFP.EFO_FOL_Seq
   AND EFO.EPG_Codigo = EFP.EFO_EPG_Codigo
LEFT JOIN EVE (NOLOCK)
    ON EFP.EMP_Codigo = EVE.EMP_Codigo
   AND EFP.EVE_Codigo = EVE.Codigo
LEFT JOIN LTA LOT (NOLOCK)
    ON EPG.EMP_Codigo = LOT.EMP_Codigo
   AND EPG.LTA_Codigo = LOT.Codigo
WHERE EFO.EMP_Codigo = @EmpresaCodigo
  AND EFO.FOL_Seq = @FolhaSeq
ORDER BY EPG.Nome, EFP.EVE_Codigo;
`;

async function extract() {
    try {
        console.log('Conectando ao banco Fortes...');
        const pool = await mssql.connect(config);
        
        console.log('Executando query...');
        const result = await pool.request().query(query);
        
        const rows = result.recordset;
        console.log(\`Extraidas \${rows.length} linhas.\`);
        
        if (rows.length === 0) {
            console.log('Nenhuma linha encontrada para Abril/2026.');
            process.exit(0);
        }

        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(';')];
        
        for (const row of rows) {
            const line = headers.map(h => {
                let val = row[h];
                if (val === null || val === undefined) return '';
                if (typeof val === 'string') return val.replace(/;/g, ',');
                return val;
            });
            csvLines.push(line.join(';'));
        }
        
        const outPath = path.resolve(__dirname, '../output/folha-fortes-real-db.csv');
        fs.writeFileSync(outPath, csvLines.join('\\n'));
        console.log(\`Arquivo salvo em: \${outPath}\`);
        
        pool.close();
    } catch (err) {
        console.error('Erro na extração:', err);
    }
}

extract();
