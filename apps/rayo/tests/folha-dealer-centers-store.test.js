import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import {
  mergeCenterMappings,
  mapCenter,
  runFolhaDealerEngine,
  ValidationCodes,
} from '../src/lib/folha-dealer/index.js';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.resolve(__dirname, '../../rayo-server/folha-dealer-centers-store.js');

describe('folha-dealer-centers-store', () => {
  let tmpDir;
  let store;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'folha-centers-'));
    process.env.FOLHA_DEALER_CENTERS_DATA_DIR = tmpDir;
    // Re-require after env set so DATA_DIR picks it up — module caches DATA_DIR at load.
    // Store resolves DATA_DIR at call-time via process.env in our implementation.
    delete require.cache[require.resolve(storePath)];
    store = require(storePath);
  });

  afterEach(() => {
    delete process.env.FOLHA_DEALER_CENTERS_DATA_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('na ausência do arquivo, grava seed e retorna centros', () => {
    const config = store.loadCentersConfig('braga-veiculos');
    expect(config.companyId).toBe('braga-veiculos');
    expect(config.centers.length).toBeGreaterThan(0);
    expect(config.lotacaoMappings.some((m) => m.lotacaoCode === 'GERAL')).toBe(true);
    expect(fs.existsSync(store.filePathFor('braga-veiculos'))).toBe(true);
  });

  it('upsert lotação normaliza pad e persiste', () => {
    store.loadCentersConfig('braga-veiculos');
    const saved = store.upsertLotacaoMapping('braga-veiculos', {
      lotacaoCode: 'LOT_TESTE',
      dealerCenterCode: '999',
      allocationMode: 'direct',
      active: true,
      centerName: 'Geral',
    });
    const mapping = saved.lotacaoMappings.find((m) => m.lotacaoCode === 'LOT_TESTE');
    expect(mapping.dealerCenterCode).toBe('000999');
    expect(saved.centers.some((c) => c.code === '000999')).toBe(true);
  });
});

describe('engine smoke — GERAL→000999 remove MISSING_CENTER_MAPPING', () => {
  it('com mapping GERAL o blocker de centro some', () => {
    const seedWithoutGeral = bragaVeiculosConfig.centerMappings.filter(
      (m) => m.lotacaoCode !== 'GERAL'
    );
    const stored = {
      centers: [{ code: '000999', name: 'Geral', active: true }],
      lotacaoMappings: [
        { lotacaoCode: 'GERAL', dealerCenterCode: '000999', allocationMode: 'direct', active: true },
      ],
    };
    const centerMappings = mergeCenterMappings(seedWithoutGeral, stored, 'braga-veiculos');
    expect(mapCenter('GERAL', 'braga-veiculos', centerMappings)?.centerCode).toBe('000999');

    const run = runFolhaDealerEngine({
      config: { ...bragaVeiculosConfig, centerMappings },
      sourceRows: [
        {
          sourceSystem: 'fortes',
          sourceAdapter: 'test',
          sourceOrigin: 'folha-mensal',
          companyId: 'braga-veiculos',
          companyName: 'BRAGA VEICULOS LTDA',
          competence: '2026-04',
          lotacaoCode: 'GERAL',
          lotacaoName: 'Geral',
          eventCode: '011',
          eventName: 'Salário-Base',
          amountCents: 10000,
          sourceLineId: 't1',
        },
      ],
      competence: '2026-04',
    });

    const missingCenter = (run.issues || []).filter(
      (i) => i.code === ValidationCodes.MISSING_CENTER_MAPPING
    );
    expect(missingCenter).toHaveLength(0);
  });
});
