import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { extractFortesPayroll } = require(path.resolve(__dirname, '../rayo-server/fortes-extractor.js'));

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
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const companyId = payload.companyId || '9274';
            const competence = payload.competence || '2026-04';

            console.log(`[API] Extract Fortes. Empresa: ${companyId}, Competência: ${competence}`);
            const extracted = await extractFortesPayroll({ companyId, competence });

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                data: extracted.payroll,
                provisions: extracted.provisions,
              })
            );
          } catch (err) {
            console.error('[API] Erro ao extrair:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: err.message || 'Internal Server Error',
              })
            );
          }
        });
      });
    },
  };
}
