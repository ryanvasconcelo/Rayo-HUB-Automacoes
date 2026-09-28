import { describe, expect, it } from 'vitest';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { bragaMotosConfig } from '../src/lib/folha-dealer/braga-motos.config.js';

// Eventos com valor em férias/rescisão no Fortes, 01–09/2026 (levantamento de
// 25/09/2026). P = provento (tem que debitar), D = desconto (tem que creditar).
const OBSERVADOS = {
  'braga-veiculos': {
    P: ['110', '111', '113', '151', '950', '085', '086', '199', '200', '203', '205', '206', '208', '209', '211', '212'],
    D: ['301', '344', '450', '500', '501', '502', '504', '507', '953', '954', '957', '971', '972'],
  },
  'braga-motos': {
    P: ['110', '111', '113', '950', '025', '105', '160', '200', '201', '203', '205', '206', '208', '209', '211', '212', '213'],
    D: ['301', '344', '122', '129', '314', '500', '501', '502', '504', '930', '971', '972', '980', '993', '994', '995'],
  },
};

// Bases de cálculo da rescisão (ProvDesc = 0): nunca geram lançamento. A multa
// FGTS (900) também é ProvDesc = 0, mas gera lançamento próprio (D/C).
const INFORMATIVOS_RESCISAO = ['610', '613', '902', '904'];

for (const config of [bragaVeiculosConfig, bragaMotosConfig]) {
  const { companyId } = config.company;
  const dcsDoEvento = (code) => config.accountMappings.filter((m) => m.eventCode === code).map((m) => m.dc);
  const contaCredito = (code) =>
    config.accountMappings.find((m) => m.eventCode === code && m.dc === 'C')?.dealerAccountCode;

  describe(`${companyId} — de-para de férias, rescisão e complementar`, () => {
    it('todo provento observado debita', () => {
      for (const code of OBSERVADOS[companyId].P) {
        expect([code, dcsDoEvento(code)]).toEqual([code, ['D']]);
      }
    });

    it('todo desconto observado credita', () => {
      for (const code of OBSERVADOS[companyId].D) {
        expect([code, dcsDoEvento(code)]).toEqual([code, ['C']]);
      }
    });

    it('bases de cálculo da rescisão são informativas', () => {
      for (const code of INFORMATIVOS_RESCISAO) {
        expect(config.informativeEventCodes).toContain(code);
      }
    });

    it('multa FGTS (900) não é informativa e tem débito e crédito', () => {
      expect(config.informativeEventCodes).not.toContain('900');
      expect(dcsDoEvento('900').sort()).toEqual(['C', 'D']);
    });

    it('líquidos vão para as contas definidas com o contador', () => {
      expect(contaCredito('LIQUIDO_FOLHA')).toBe('2.1.1.01.001');
      expect(contaCredito('LIQUIDO_FERIAS')).toBe('1.1.4.01.002');
      expect(contaCredito('LIQUIDO_RESCISAO')).toBe('2.1.1.01.004');
      expect(contaCredito('LIQUIDO_COMPLEMENTAR')).toBe('2.1.1.01.001');
    });
  });
}
