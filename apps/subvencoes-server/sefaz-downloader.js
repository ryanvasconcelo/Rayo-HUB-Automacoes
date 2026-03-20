/**
 * SEFAZ-AM NF-e Downloader — Playwright
 *
 * Autenticação: certificado digital A1 (.pfx) via Playwright clientCertificates
 * Variáveis de ambiente (.env):
 *   SEFAZ_IE           — Inscrição Estadual
 *   SEFAZ_PFX_PATH     — Caminho absoluto do arquivo .pfx
 *   SEFAZ_PFX_SENHA    — Senha/passphrase do certificado
 *   SEFAZ_CFOP         — CFOP padrão (opcional)
 *   SEFAZ_HEADLESS     — "true" para rodar sem janela (default: false para debug)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const URL_LOGIN = 'https://online.sefaz.am.gov.br/dte/loginSSL.asp';
const URL_EMPRESA = (ie) => `https://online.sefaz.am.gov.br/dte/sel_inscricao_pj.asp?inscricao=${ie}`;
const TIMEOUT = 90000;

function formatarData(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dividirPeriodo(dtIni, dtFin, limiteDias = 92) {
  const periodos = [];
  let inicio = new Date(dtIni);
  const fim = new Date(dtFin);
  while (inicio <= fim) {
    let limFim = new Date(inicio);
    limFim.setDate(limFim.getDate() + limiteDias - 1);
    if (limFim > fim) limFim = new Date(fim);
    periodos.push({
      ini: inicio.toISOString().split('T')[0],
      fin: limFim.toISOString().split('T')[0],
    });
    inicio = new Date(limFim);
    inicio.setDate(inicio.getDate() + 1);
  }
  return periodos;
}

function extrairZips(zipPaths, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const zipPath of zipPaths) {
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destino, true);
    } catch (e) {
      console.warn(`[SEFAZ] ⚠️ Erro ao extrair ${path.basename(zipPath)}: ${e.message}`);
    }
  }
  try {
    return fs.readdirSync(destino).filter((f) => f.toLowerCase().endsWith('.xml')).length;
  } catch {
    return 0;
  }
}

async function processarPagina(page, downloadDir) {
  try {
    const loc = page.locator('input[value="   Download   "], input[value="    Voltar    "]').first();
    await loc.waitFor({ state: 'visible', timeout: TIMEOUT });
  } catch {
    console.log('[SEFAZ] Timeout: sem resultados ou sem botão de download nesta página.');
    return null;
  }

  const downloadVisivel = await page.locator('input[value="   Download   "]').first().isVisible();
  if (!downloadVisivel) {
    console.log('[SEFAZ] Nenhuma nota fiscal nesta página.');
    return null;
  }

  await page.locator('#selectAll').check();
  await page.waitForTimeout(500);

  console.log('[SEFAZ] Download disparado...');

  const [ download ] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('input[value="   Download   "]').first().click()
  ]);

  const zipPath = path.join(downloadDir, `${Date.now()}_${download.suggestedFilename()}`);
  await download.saveAs(zipPath);

  try { await page.locator('#selectAll').uncheck(); } catch { }

  return zipPath;
}

async function clicarProximaPagina(page) {
  const proximo = page.locator("a:has-text('Próximo')");
  if (await proximo.count() > 0) {
    await proximo.first().click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function baixarXmlsSefaz({ ie, dtIni, dtFin, cfops, outputDir, pfxPath, pfxSenha }) {
  const listaCfops = (Array.isArray(cfops) && cfops.length > 0) ? cfops : [''];
  console.log(`\n[SEFAZ] ═══════════════════════════════════════════════════`);
  console.log(`[SEFAZ] IE=${ie} | ${dtIni} → ${dtFin} | CFOPs=${listaCfops.join(',')}`);
  console.log(`[SEFAZ] ═══════════════════════════════════════════════════\n`);

  const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sefaz-'));
  const pastaRecebidas = path.join(outputDir, ie, 'Notas_Recebidas');

  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ];

  const headless = process.env.SEFAZ_HEADLESS === 'true';

  const browser = await chromium.launch({
    headless,
    args: browserArgs,
  });

  const contextOptions = {
    acceptDownloads: true,
  };

  if (pfxPath && fs.existsSync(pfxPath)) {
    console.log(`[SEFAZ] Usando certificado: ${path.basename(pfxPath)}`);
    contextOptions.clientCertificates = [{
        origin: 'https://online.sefaz.am.gov.br',
        pfxPath: pfxPath,
        passphrase: pfxSenha || ''
    }];
  } else {
    console.warn(`[SEFAZ] ⚠️ Arquivo de certificado não encontrado: ${pfxPath}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  try {
    console.log('[SEFAZ] 1/5 Login...');
    await page.goto(URL_LOGIN, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('.dg_table tbody tr', { timeout: TIMEOUT });
    console.log('[SEFAZ] ✅ Login via certificado OK');

    console.log(`[SEFAZ] 2/5 Navegando para IE=${ie}...`);
    await page.goto(URL_EMPRESA(ie), { waitUntil: 'domcontentloaded' });

    const popup = page.locator('.popupDte_area');
    if (await popup.count() > 0) {
      await popup.evaluate(el => el.remove());
    }

    console.log('[SEFAZ] 3/5 Abrindo menu NF-e...');
    await page.locator('.menuDte_conteudoCategoria2').click();
    await page.locator('.menuDte_menu2 div[idlink="42"]').click();
    await page.locator('#datepicker_de').waitFor({ timeout: TIMEOUT });
    console.log('[SEFAZ] ✅ Formulário de filtros pronto');

    const periodos = dividirPeriodo(dtIni, dtFin, 92);
    const zipsColetados = [];

    for (const { ini, fin } of periodos) {
      console.log(`[SEFAZ] 4/5 Período: ${ini} → ${fin}`);

      for (const cfopCurrent of listaCfops) {
        if (cfopCurrent) console.log(`[SEFAZ] -> Aplicando filtro CFOP: ${cfopCurrent}`);

        await page.locator('input[type="radio"][value="55"]').check();
        await page.locator('#origem_nfe').selectOption('RECEBIDAS');
        await page.locator('select[name="situacaoNFe"]').selectOption('AUTORIZADAS');

        const cfopInput = page.locator('input[name="CFOP"], input[id="CFOP"]');
        if (cfopCurrent && await cfopInput.count() > 0) {
          await cfopInput.first().fill(String(cfopCurrent));
        } else if (await cfopInput.count() > 0) {
          await cfopInput.first().fill('');
        }

        await page.locator('#datepicker_de').fill(formatarData(ini));
        await page.locator('#datepicker_ate').fill(formatarData(fin));

        await page.locator('input[type="submit"]').click();

        let pagina = 1;
        while (true) {
          console.log(`[SEFAZ] Página ${pagina}...`);

          let zip = null;
          for (let tentativa = 1; tentativa <= 2; tentativa++) {
            try {
              zip = await processarPagina(page, tempDir);
              break;
            } catch (errPagina) {
              if (tentativa === 2) throw errPagina;
              console.warn(`[SEFAZ] ⚠️ Página ${pagina} falhou (tentativa ${tentativa}), aguardando 3s...`);
              await page.waitForTimeout(3000);
            }
          }

          if (zip) {
            console.log(`[SEFAZ] ✅ ZIP salvo: ${path.basename(zip)}`);
            zipsColetados.push(zip);
          }

          const temProxima = await clicarProximaPagina(page);
          if (!temProxima) break;
          pagina++;
        }

        try {
          await page.locator('input[value="    Voltar    "]').first().click();
          await page.locator('#datepicker_de').waitFor({ timeout: 15000 });
        } catch {
          await page.locator('.menuDte_conteudoCategoria2').click().catch(()=>{});
          await page.locator('.menuDte_menu2 div[idlink="42"]').click().catch(()=>{});
          await page.locator('#datepicker_de').waitFor({ timeout: 15000 }).catch(()=>{});
        }
      } // for cfopCurrent
    }

    console.log(`\n[SEFAZ] 5/5 Extraindo XMLs de ${zipsColetados.length} ZIPs...`);
    const totalXmls = extrairZips(zipsColetados, pastaRecebidas);
    console.log(`[SEFAZ] ✅ ${totalXmls} XMLs extraídos → ${pastaRecebidas}`);

    return { total: totalXmls, outputDir: pastaRecebidas };

  } catch (err) {
    await page.screenshot({ path: 'debug-sefaz-ERRO.png', fullPage: true }).catch(() => {});
    console.error('[SEFAZ] ❌ Erro:', err.message);
    throw err;
  } finally {
    await context.close();
    await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = { baixarXmlsSefaz };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const { SEFAZ_IE, SEFAZ_PFX_PATH, SEFAZ_PFX_SENHA, SEFAZ_CFOP } = process.env;

  if (!SEFAZ_IE) {
    console.error('[CLI] Configure SEFAZ_IE no .env');
    process.exit(1);
  }

  baixarXmlsSefaz({
    ie: SEFAZ_IE,
    pfxPath: SEFAZ_PFX_PATH || '',
    pfxSenha: SEFAZ_PFX_SENHA || '',
    dtIni: process.argv[2] || '2026-01-01',
    dtFin: process.argv[3] || '2026-01-31',
    cfop: process.argv[4] || SEFAZ_CFOP || '',
    outputDir: path.join(__dirname, 'data', 'xmls-entrada'),
  })
    .then((r) => console.log(`\n✅ ${r.total} XMLs extraídos em ${r.outputDir}`))
    .catch((e) => { console.error('❌', e.message); process.exit(1); });
}
