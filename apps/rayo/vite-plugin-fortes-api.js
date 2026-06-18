import mssql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente (se existirem)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'biprojecont',
    password: process.env.DB_PASSWORD || 'proj@#2087!',
    server: process.env.DB_HOST || '192.168.0.5',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_DATABASE || 'AC',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    requestTimeout: 300000
};

export function fortesApiPlugin() {
    return {
        name: 'vite-plugin-fortes-api',
        configureServer(server) {
            server.middlewares.use('/api/fortes/extract', async (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                    return;
                }

                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });

                req.on('end', async () => {
                    try {
                        const payload = JSON.parse(body);
                        const companyId = payload.companyId || '9274'; // Padrão Braga
                        
                        // Parse competence "YYYY-MM" to "YYYYMM"
                        const competence = payload.competence || '2026-04';
                        const [anoStr, mesStr] = competence.split('-');
                        const ano = parseInt(anoStr, 10);
                        const mes = parseInt(mesStr, 10);
                        const anoMesStr = anoStr + mesStr.padStart(2, '0');

                        console.log(`[API] Conectando ao Fortes para extrair Folha. Empresa: ${companyId}, Competência: ${anoMesStr}`);
                        
                        const pool = await mssql.connect(dbConfig);
                        
                        const query = `
                        DECLARE @EmpresaCodigo VARCHAR(4) = @Company;
                        DECLARE @Ano INT = @AnoParam;
                        DECLARE @Mes INT = @MesParam;
                        DECLARE @AnoMes VARCHAR(6) = @AnoMesParam;
                        
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
                            '' AS lotacaoCode,
                            '' AS lotacaoName
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
                        WHERE EFO.EMP_Codigo = @EmpresaCodigo
                          AND EFO.FOL_Seq = @FolhaSeq
                        ORDER BY EPG.Nome, EFP.EVE_Codigo;
                        `;
                        
                        const result = await pool.request()
                            .input('Company', mssql.VarChar(4), companyId)
                            .input('AnoParam', mssql.Int, ano)
                            .input('MesParam', mssql.Int, mes)
                            .input('AnoMesParam', mssql.VarChar(6), anoMesStr)
                            .query(query);
                            
                        pool.close();
                        
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: true,
                            data: result.recordset
                        }));
                        
                    } catch (err) {
                        console.error('[API] Erro ao extrair:', err);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: err.message || 'Internal Server Error'
                        }));
                    }
                });
            });
        }
    };
}
