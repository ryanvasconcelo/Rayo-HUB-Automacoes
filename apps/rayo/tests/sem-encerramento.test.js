import { describe, it, expect } from 'vitest';
import { runAudit } from '../src/lib/auditor/icms-auditor.js';

describe('Auditor ICMS - Sem Encerramento', () => {
    it('deve marcar NCM 0901 como sem encerramento com agregado 30%', () => {
        const alterdataRows = [{
            'Classificação': '09019999', 
            'Descrição': 'CAFE TORRADO E MOIDO',
            'CST ICMS': '060', // Item ST e sem encerramento
            'CFOP': '2102',
            'ICMS Base item': 0,
            'Valor Total Item': 100,
            'Valor ICMS': 0
        }];

        const perfil = { natureza: 'comercio', regime: 'geral' };
        const result = runAudit(alterdataRows, null, perfil);

        const diag = result.diagnostico[0];
        
        expect(diag.tipo_match_ncm).toBe('NCM_4_DIGITOS');
        expect(diag.ncm_utilizado).toBe('0901');
        expect(diag.ncm_8_digitos_valido).toBe(false);
        expect(diag.icms_sem_encerramento).toBe(true);
        expect(diag.percentual_agregado).toBe(0.30);
        expect(diag.base_legal_utilizada).toContain('Base Parcial Sem Encerramento');
        
        expect(diag.pis_cofins_monofasico).toBeNull();
        expect(diag.pis_cofins_monofasico_status).toBe('BASE_MONOFASICA_NAO_CARREGADA');
        expect(diag.icms_st).toBe(true); // Porque 0901 também está na lei de ST
    });

    it('deve marcar NCM 2204 como sem encerramento com agregado 50%', () => {
        const alterdataRows = [{
            'Classificação': '22042100', 
            'Descrição': 'VINHO',
            'CST ICMS': '060', // Item ST e sem encerramento
            'CFOP': '2102',
            'ICMS Base item': 0,
            'Valor Total Item': 100,
            'Valor ICMS': 0
        }];

        const perfil = { natureza: 'comercio', regime: 'geral' };
        const result = runAudit(alterdataRows, null, perfil);

        const diag = result.diagnostico[0];
        
        expect(diag.tipo_match_ncm).toBe('NCM_8_DIGITOS');
        expect(diag.ncm_utilizado).toBe('22042100');
        expect(diag.ncm_8_digitos_valido).toBe(true);
        expect(diag.icms_sem_encerramento).toBe(true);
        expect(diag.percentual_agregado).toBe(0.50);
        
        expect(diag.pis_cofins_monofasico).toBeNull();
        expect(diag.pis_cofins_monofasico_status).toBe('BASE_MONOFASICA_NAO_CARREGADA');
        expect(diag.icms_st).toBe(true); // Porque 2204 também está na lei de ST
    });
});
