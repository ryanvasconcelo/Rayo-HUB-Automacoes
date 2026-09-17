import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { extractFortesPayroll } = require(path.resolve(__dirname, '../rayo-server/fortes-extractor.js'));
const {
  loadCentersConfig,
  saveCentersConfig,
  upsertLotacaoMapping,
  deleteLotacaoMapping,
} = require(path.resolve(__dirname, '../rayo-server/folha-dealer-centers-store.js'));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function buildFortesExtractResponse(extracted) {
  return {
    success: true,
    data: extracted.payroll,
    provisions: extracted.provisions,
    encargoBases: extracted.encargoBases,
    encargoUnmapped: extracted.encargoUnmapped,
    encargoCoverage: extracted.encargoCoverage,
  };
}

function handleCentersApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  return (async () => {
    try {
      if (pathname === '/api/folha-dealer/centers' && req.method === 'GET') {
        const companyId = url.searchParams.get('companyId') || 'braga-veiculos';
        return sendJson(res, 200, loadCentersConfig(companyId));
      }

      if (pathname === '/api/folha-dealer/centers' && req.method === 'PUT') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const companyId = body.companyId || 'braga-veiculos';
        if (!Array.isArray(body.centers) || !Array.isArray(body.lotacaoMappings)) {
          return sendJson(res, 400, {
            error: 'Body deve incluir arrays "centers" e "lotacaoMappings".',
          });
        }
        return sendJson(
          res,
          200,
          saveCentersConfig(companyId, {
            companyId,
            centers: body.centers,
            lotacaoMappings: body.lotacaoMappings,
          })
        );
      }

      if (pathname === '/api/folha-dealer/centers/lotacao' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const companyId = body.companyId || 'braga-veiculos';
        if (body.lotacaoCode === undefined || body.lotacaoCode === null || !body.dealerCenterCode) {
          return sendJson(res, 400, {
            error: 'Campos obrigatórios: lotacaoCode, dealerCenterCode.',
          });
        }
        return sendJson(res, 200, upsertLotacaoMapping(companyId, body));
      }

      const lotacaoMatch = pathname.match(/^\/api\/folha-dealer\/centers\/lotacao\/(.+)$/);
      if (lotacaoMatch && req.method === 'DELETE') {
        const companyId = url.searchParams.get('companyId') || 'braga-veiculos';
        const lotacaoCode = decodeURIComponent(lotacaoMatch[1]);
        const result = deleteLotacaoMapping(companyId, lotacaoCode);
        if (!result.deleted) {
          return sendJson(res, 404, {
            error: `De-para não encontrado para lotação "${lotacaoCode}".`,
            config: result.config,
          });
        }
        return sendJson(res, 200, result);
      }

      return false;
    } catch (err) {
      console.error('[API] folha-dealer/centers:', err);
      sendJson(res, 500, { error: err.message || 'Internal Server Error' });
      return true;
    }
  })();
}

export function fortesApiPlugin() {
  return {
    name: 'vite-plugin-fortes-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/folha-dealer/centers')) {
          const handled = await handleCentersApi(req, res);
          if (handled !== false) return;
        }
        next();
      });

      server.middlewares.use('/api/fortes/extract', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const body = await readBody(req);
          const payload = JSON.parse(body || '{}');
          const companyId = payload.companyId || '9274';
          const competence = payload.competence || '2026-04';

          console.log(`[API] Extract Fortes. Empresa: ${companyId}, Competência: ${competence}`);
          const extractorPath = path.resolve(__dirname, '../rayo-server/fortes-extractor.js');
          delete require.cache[require.resolve(extractorPath)];
          const { extractFortesPayroll: dynamicExtract } = require(extractorPath);
          const extracted = await dynamicExtract({ companyId, competence });

          sendJson(res, 200, buildFortesExtractResponse(extracted));
        } catch (err) {
          console.error('[API] Erro ao extrair:', err);
          sendJson(res, 500, {
            success: false,
            error: err.message || 'Internal Server Error',
          });
        }
      });
    },
  };
}
