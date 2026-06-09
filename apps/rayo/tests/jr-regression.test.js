import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseSpedIcms } from '../src/lib/parser/sped-icms-parser.js';
import { parseXmlIcms } from '../src/lib/parser/xml-icms-parser.js';
import { runAudit } from '../src/lib/auditor/icms-auditor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Auditor ICMS - Regressão Empresa JR', () => {
  it('deve processar o SPED TXT e reconciliar com XMLs da JR', () => {
    const jrFixturePath = path.resolve(__dirname, 'fixtures/jr');
    const spedPath = path.join(jrFixturePath, 'sped-jr.txt');
    const spedContent = fs.readFileSync(spedPath, 'utf8');
    expect(spedContent.length).toBeGreaterThan(0);
    
    // Parse SPED
    const spedLines = spedContent.split('\n');
    const itensSped = parseSpedIcms(spedLines);
    expect(itensSped).toBeDefined();
    expect(itensSped.length).toBeGreaterThan(0);

    // Parse XMLs
    const xmlItems = [];
    const walkSync = (dir, filelist = []) => {
      fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
          filelist = walkSync(dirFile, filelist);
        } else if (file.endsWith('.xml') || file.endsWith('.XML')) {
          filelist.push(dirFile);
        }
      });
      return filelist;
    };
    
    const xmlFiles = walkSync(jrFixturePath);
    let numXmlsParsed = 0;
    xmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const parsed = parseXmlIcms(content);
      if (parsed.length > 0) {
          xmlItems.push(...parsed);
          numXmlsParsed++;
      }
    });

    console.log(`\n--- Métricas da Wave 2 ---`);
    console.log(`XMLs encontrados e válidos: ${numXmlsParsed}`);
    console.log(`Total de itens em XMLs: ${xmlItems.length}`);
    console.log(`Total de itens no SPED: ${itensSped.length}`);

    // Mapear itens para o formato que o auditor aceita
    const itensMapeados = itensSped.map(item => ({
        'Chave_NFe': item.chv_nfe,
        'Num_Item': item.num_item,
        'Classificação': item.ncm,
        'CST ICMS': item.cst_icms,
        'CFOP': item.cfop,
        'ICMS Base item': item.base_calculo,
        'Valor Total Item': item.valor_item,
        'UF Emitente': item.uf_emitente || 'SP', // fallback
        'Descrição': item.descricao_item
    }));

    // Audit com Reconciliação
    const perfil = { natureza: 'comercio', regime: 'geral' };
    const result = runAudit(itensMapeados, null, perfil, xmlItems);

    expect(result.diagnostico).toBeDefined();
    expect(result.correctedData.length).toBe(itensMapeados.length);

    // Métricas de Reconciliação
    let matchCount = 0;
    let semMatchCount = 0;
    let fallbackCount = 0;
    let divergenciasCount = 0;

    result.diagnostico.forEach(diag => {
        if (diag.ncm_xml) {
            matchCount++;
            if (diag.divergencias_reais.length > 0) divergenciasCount++;
            if (diag.descricao_fonte === 'XML' || diag.ncm_fonte === 'XML' || diag.cfop_fonte === 'XML') {
                fallbackCount++;
            }
        } else {
            semMatchCount++;
        }
    });

    console.log(`Itens SPED com match no XML: ${matchCount}`);
    console.log(`Itens SPED sem match no XML: ${semMatchCount}`);
    console.log(`Itens com enriquecimento via fallback XML: ${fallbackCount}`);
    console.log(`Itens com divergências comparáveis (valores/NCM) entre os matches: ${divergenciasCount}`);
    if (divergenciasCount > 0) {
        const exDivergencia = result.diagnostico.find(d => d.ncm_xml && d.divergencias_comparaveis.length > 0);
        if (exDivergencia) {
            console.log(`Exemplo de divergência na linha ${exDivergencia.linha}:`);
            console.log(exDivergencia.divergencias_comparaveis.join(' | '));
        }
    }
    
    // Contar diferenças de perspectiva
    const perspectivaCount = result.diagnostico.filter(d => d.diferencas_perspectiva.length > 0).length;
    console.log(`Itens com diferenças de perspectiva (CFOP/CST): ${perspectivaCount}`);
    
    console.log(`--------------------------\n`);

    // Validações explícitas de CST exigidas na Wave 1:
    const originCounts = { 1: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    result.correctedData.forEach((row, i) => {
      const cstStr = row['CST ICMS'];
      const origin = cstStr.charAt(0);
      
      // Contabilizar para checar se as origens 5, 6, 7, 8 estão presentes e preservadas
      if (['1','5','6','7','8'].includes(origin)) {
          originCounts[origin]++;
      }
      
      // Validação: CST "100" não deve ter virado "06" nem "060" (preservação de origem)
      if (row['CST Antigo'] === '100') {
          expect(cstStr).not.toBe('06');
          expect(cstStr).not.toBe('060');
      }

      // Validação: CSTs convertidos para ST devem terminar em 60 (ex: 560, 860) e preservar origem
      if (row['CST Antigo'] === '500' && cstStr.endsWith('60')) expect(cstStr).toBe('560');
      if (row['CST Antigo'] === '800' && cstStr.endsWith('60')) expect(cstStr).toBe('860');

      // Validação: CFOP e descrição não ficam vazios (quando presentes no SPED original ou enriquecidos)
      expect(row['CFOP']).toBeDefined();
      expect(row['Descrição']).toBeDefined();
    });

    // Validar se o parser está trazendo o NCM do registro 0200 ou XML
    const ncmValidos = result.correctedData.filter(row => row['Classificação'] && row['Classificação'].trim() !== '');
    expect(ncmValidos.length).toBeGreaterThan(0);

    // --- MÉTRICAS WAVE 3 ---
    let itemsX60Count = 0;
    let itemsX60ComBaseIndevida = 0;
    let safeguardAcionada = 0;
    
    result.diagnostico.forEach(diag => {
        if (diag.cst_sped && diag.cst_sped.endsWith('60')) {
            itemsX60Count++;
        }
    });

    const correcoesSugeridas = {};

    result.report.forEach(rep => {
        if (rep.motivo.includes('Regra CST x60')) {
            itemsX60ComBaseIndevida++;
        }
        if (rep.motivo.includes('Salvaguarda ST')) {
            safeguardAcionada++;
        }
        if (rep.correcaoAplicada) {
            correcoesSugeridas[rep.motivo] = (correcoesSugeridas[rep.motivo] || 0) + 1;
        }
    });

    console.log(`\n--- Métricas da Wave 3 ---`);
    console.log(`Total de itens com CST x60 no SPED: ${itemsX60Count}`);
    console.log(`Itens x60 que possuíam base/ICMS maior que zero (corrigidos): ${itemsX60ComBaseIndevida}`);
    console.log(`Salvaguarda acionada (ST impedido de virar Tributado): ${safeguardAcionada}`);
    console.log(`Correções automáticas sugeridas pelo Auditor:`, correcoesSugeridas);
    console.log(`--------------------------\n`);
  });
});
