import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { bragaVeiculosConfig } from '../src/lib/folha-dealer/braga-veiculos.config.js';
import { mergeCenterMappings } from '../src/lib/folha-dealer/merge-center-config.js';

const read = (relative) =>
  JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));

const seed = read('../../rayo-server/folha-dealer-centers-seed-braga.json');

// O de-para vivo do servidor fica em apps/rayo-server/data/, que é gitignored:
// existe na máquina de quem já rodou o app e não existe num checkout limpo.
// Quando existe, ele sobrescreve o seed — então vale conferir os dois.
const storedUrl = new URL('../../rayo-server/data/folha-dealer-centers-braga-veiculos.json', import.meta.url);
const stored = existsSync(storedUrl) ? read(storedUrl) : null;

/**
 * O Dealer rejeita o lote inteiro com "Centro de Resultado de Débito XXXXXX não
 * encontrado [UP_CNT_IntegracaoContabil_Lancamento]" quando recebe um centro que
 * não existe no cadastro dele. O 000999 ("Geral") nunca existiu no Dealer da
 * Braga Veículos — era um código inventado aqui — e derrubava a importação
 * sempre que a lotação GERAL tinha movimento (provisões e encargos).
 */
describe('Braga Veículos — centros aceitos pelo Dealer', () => {
  it('não usa o centro fantasma 000999 em lugar nenhum', () => {
    expect(bragaVeiculosConfig.centerMappings.map((m) => m.dealerCenterCode)).not.toContain('000999');
    expect(seed.centers.map((c) => c.code)).not.toContain('000999');
    expect(seed.lotacaoMappings.map((m) => m.dealerCenterCode)).not.toContain('000999');
    if (stored) {
      expect(stored.centers.map((c) => c.code)).not.toContain('000999');
      expect(stored.lotacaoMappings.map((m) => m.dealerCenterCode)).not.toContain('000999');
    }
  });

  it('manda a lotação GERAL para a Administração, como já faz com a lotação vazia', () => {
    const destino = (lotacaoCode) =>
      bragaVeiculosConfig.centerMappings.find((m) => m.lotacaoCode === lotacaoCode)?.dealerCenterCode;

    expect(destino('')).toBe('000600');
    expect(destino('GERAL')).toBe('000600');
    expect(destino('999')).toBe('000600');
  });

  it('só aponta para centros que estão no cadastro, mesmo depois do merge com o servidor', () => {
    const cadastro = stored ?? seed;
    const cadastrados = new Set(cadastro.centers.map((c) => c.code));
    const merged = mergeCenterMappings(bragaVeiculosConfig.centerMappings, cadastro, 'braga-veiculos');

    const foraDoCadastro = merged
      .map((m) => m.dealerCenterCode)
      .filter((code) => code && !cadastrados.has(code));

    expect([...new Set(foraDoCadastro)]).toEqual([]);
  });
});
