import { describe, it, expect } from 'vitest';
import { runAudit } from '../src/lib/auditor/icms-auditor.js';

describe('Auditor ICMS - Salvaguarda ST', () => {
    it('deve manter o CST original se for ST (x60) e não houver base legal local, acionando a salvaguarda', () => {
        // NCM 17049010 - Chocolate Branco
        // Simulando que o e-Auditoria (regra mockada) diz que é tributado (CST 00),
        // mas na escrituração estava ST (CST 160).
        const alterdataRows = [{
            'Classificação': '17049010',
            'Descrição': 'CHOCOLATE BRANCO',
            'CST ICMS': '160',
            'CFOP': '2102',
            'ICMS Base item': 0,
            'Valor Total Item': 100,
            'Valor ICMS': 0
        }];

        const eAuditoriaRows = [{
            'NCM': '17049010',
            'Descrição do Produto': 'CHOCOLATE BRANCO',
            'CST/CSOSN': '000' // Regra diz que é tributado!
        }];

        const perfil = { natureza: 'comercio', regime: 'geral' };

        const result = runAudit(alterdataRows, eAuditoriaRows, perfil);

        // A salvaguarda deve ter barrado a mudança de 160 para 100
        expect(result.correctedData[0]['CST ICMS']).toBe('160');
        expect(result.correctedData[0]['ICMS Base item']).toBe(0);

        // Deve existir um alerta no report de salvaguarda acionada
        const alerta = result.report.find(r => r.motivo.includes('Salvaguarda ST'));
        expect(alerta).toBeDefined();
        expect(alerta.severidade).toBe('alerta');
    });

    it('deve zerar a base de cálculo se o CST for x60, mesmo sem NCM na lista 6108', () => {
        const alterdataRows = [{
            'Classificação': '99999999', // NCM genérico
            'CST ICMS': '560',
            'CFOP': '2102',
            'ICMS Base item': 100, // Incorreto para x60
            'Valor Total Item': 200,
            'Valor ICMS': 18
        }];

        const perfil = { natureza: 'comercio', regime: 'geral' };
        const result = runAudit(alterdataRows, null, perfil);

        expect(result.correctedData[0]['CST ICMS']).toBe('560');
        expect(result.correctedData[0]['ICMS Base item']).toBe(0);
        expect(result.correctedData[0]['Valor ICMS']).toBe(0);

        const erro = result.report.find(r => r.motivo.includes('Regra CST x60'));
        expect(erro).toBeDefined();
    });
});
