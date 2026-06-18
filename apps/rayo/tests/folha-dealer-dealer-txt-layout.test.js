import { describe, expect, it } from 'vitest';
import {
  onlyDigits,
  normalizeDc,
  padRight,
  padLeft,
  formatDealerLotAccount,
  formatMoneyDealerComma,
  formatDateDealer,
  formatDealerCenter,
  sanitizeHistory,
  stripDiacritics,
  buildDealerTxtLine483,
  validateDealerTxtLine483,
  // Legacy exports — backward compat
  formatMoneyDealer,
  formatDealerAccount,
  buildDealerTxtSegments,
  buildDealerTxtLine,
} from '../src/lib/folha-dealer/dealer-txt-layout.js';

import { DEALER_LINE_LENGTH } from '../src/lib/folha-dealer/contracts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultParams = {
  dealerCompanyField: '01',
  dealerBranchField: '001',
  debitLotAccount: '123001000001',
  debitCenter: '001000',
  debitRcoAccount: '6.1.1.01.002',
  creditLotAccount: null,
  creditCenter: null,
  creditRcoAccount: null,
  sequencial: 1,
  history: 'FOLHA DE PAGAMENTO REF 04/2026',
  accountingDate: '2026-04-30',
  amountCents: 4247217,
};

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

describe('Dealer TXT Layout 483 — Helpers', () => {
  it('onlyDigits remove pontuação', () => {
    expect(onlyDigits('6.1.1.01.002')).toBe('61101002');
    expect(onlyDigits('123001000001')).toBe('123001000001');
  });

  it('normalizeDc trata maiúsculo e minúsculo', () => {
    expect(normalizeDc('d')).toBe('D');
    expect(normalizeDc(' C ')).toBe('C');
    expect(normalizeDc('X')).toBe('');
  });

  it('formatDealerLotAccount converte 6.1.1.01.002 para 61101002 (com espaços à esquerda)', () => {
    const res = formatDealerLotAccount('6.1.1.01.002', 20);
    // 4 espaços + 8 digitos + 8 espaços à direita = 20
    expect(res).toBe('    61101002        ');
  });

  it('formatDealerLotAccount converte 2.1.1.01.001 para 21101001 (com espaços à esquerda)', () => {
    const res = formatDealerLotAccount('2.1.1.01.001', 12);
    expect(res).toBe('    21101001');
  });

  it('formatDealerLotAccount converte 2.1.1.02.001 para 21102001 (com espaços à esquerda)', () => {
    const res = formatDealerLotAccount('2.1.1.02.001', 12);
    expect(res).toBe('    21102001');
  });

  it('formatDealerLotAccount mantém conta já sem pontos preenchida à esquerda', () => {
    const res = formatDealerLotAccount('21102001', 12);
    expect(res).toBe('    21102001');
  });

  it('formatDealerLotAccount retorna espaços se vazio ou lança erro se apenas letras', () => {
    expect(formatDealerLotAccount(null, 12)).toBe('            ');
    expect(() => formatDealerLotAccount('XYZ', 12)).toThrow(/não contém dígitos válidos/);
  });

  it('formatMoneyDealerComma formata com vírgula e zeros à esquerda', () => {
    expect(formatMoneyDealerComma(4247217, 18)).toBe('000000000042472,17');
    expect(formatMoneyDealerComma(100, 18)).toBe('000000000000001,00');
    expect(formatMoneyDealerComma(7849, 18)).toBe('000000000000078,49');
    expect(formatMoneyDealerComma(0, 18)).toBe('000000000000000,00');
  });

  it('formatDateDealer converte YYYY-MM-DD para DDMMYYYY (8 chars)', () => {
    expect(formatDateDealer('2026-04-30')).toBe('30042026');
    expect(formatDateDealer('30/04/2026')).toBe('30042026');
  });

  it('formatDealerCenter preserva centro para classe >= 3', () => {
    expect(formatDealerCenter('001000', '6.1.1.01.002', 10)).toBe('001000    ');
  });

  it('formatDealerCenter remove centro para classe 1 ou 2', () => {
    expect(formatDealerCenter('001000', '2.1.1.02.001', 10)).toBe(' '.repeat(10));
    expect(formatDealerCenter('001000', '1.1.4.01.004', 10)).toBe(' '.repeat(10));
  });

  it('stripDiacritics remove acentos', () => {
    expect(stripDiacritics('SALÁRIOS')).toBe('SALARIOS');
    expect(stripDiacritics('Refeição')).toBe('Refeicao');
    expect(stripDiacritics('Prêmio')).toBe('Premio');
  });

  it('sanitizeHistory uppercase, sem acentos, 250 chars', () => {
    const result = sanitizeHistory('Folha de Pagamento Ref 04/2026', 250);
    expect(result).toBe('FOLHA DE PAGAMENTO REF 04/2026' + ' '.repeat(220));
    expect(result.length).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// buildDealerTxtLine483
// ---------------------------------------------------------------------------

describe('Dealer TXT Layout 483 — buildDealerTxtLine483', () => {
  it('gera linha de exatamente 483 caracteres', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.length).toBe(483);
  });

  it('data 1 e data 2 corretas nas posições 374-389', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    lines.forEach((line) => {
      expect(line.substring(373, 381)).toBe('30042026');
      expect(line.substring(381, 389)).toBe('30042026');
    });
  }); it('filial 001 nas posições 13-15', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(12, 15)).toBe('001');
  });

  it('conta débito nas posições 16-35 com 12 dígitos', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(15, 35).trim()).toBe('123001000001');
  });

  it('centro débito nas posições 36-45', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(35, 45).trim()).toBe('001000');
  });

  it('conta crédito nas posições 63-82 vazia quando dc = D', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(62, 82).trim()).toBe('');
  });

  it('data 1 nas posições 374-381 (8 chars DDMMYYYY)', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(373, 381)).toBe('30042026');
  });

  it('data 2 nas posições 382-389 (mesma data, 8 chars)', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(381, 389)).toBe('30042026');
  });

  it('valor nas posições 412-429 com vírgula e zeros', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(411, 429)).toBe('000000000042472,17');
  });

  it('padding final de 54 espaços nas posições 430-483', () => {
    const line = buildDealerTxtLine483(defaultParams);
    expect(line.substring(429, 483)).toBe(' '.repeat(54));
  });

  it('sequencial nas posições 110-117', () => {
    const line = buildDealerTxtLine483({ ...defaultParams, sequencial: 42 });
    expect(line.substring(109, 117).trim()).toBe('42');
  });

  it('histórico nas posições 122-371 sem acentos', () => {
    const params = { ...defaultParams, history: 'Salários Ref Março' };
    const line = buildDealerTxtLine483(params);
    const hist = line.substring(121, 371).trim();
    expect(hist).toBe('SALARIOS REF MARCO');
    expect(hist).not.toContain('á');
  });

  it('entry C preenche apenas conta crédito', () => {
    const params = {
      ...defaultParams,
      debitLotAccount: null,
      debitCenter: null,
      debitRcoAccount: null,
      creditLotAccount: '214001000001',
      creditCenter: null,
      creditRcoAccount: '2.1.1.01.001',
    };
    const line = buildDealerTxtLine483(params);
    expect(line.length).toBe(483);
    expect(line.substring(15, 35).trim()).toBe(''); // débito vazio
    expect(line.substring(62, 82).trim()).toBe('214001000001'); // crédito preenchido
    expect(line.substring(82, 92).trim()).toBe(''); // centro crédito vazio (classe 2)
  });

  it('conta com pontos no parâmetro lança erro', () => {
    const params = { ...defaultParams, debitLotAccount: '6.1.1.01.002' };
    expect(() => buildDealerTxtLine483(params)).toThrow('INVALID_DEALER_ACCOUNT_FORMAT');
  });

  it('linha nunca contém conta RCO005 com pontos', () => {
    const line = buildDealerTxtLine483(defaultParams);
    // A conta RCO005 '6.1.1.01.002' é passada como debitRcoAccount para
    // decidir classe, mas NUNCA aparece no TXT
    expect(line).not.toContain('6.1.1.01.002');
    expect(line).not.toContain('.');
  });
});

// ---------------------------------------------------------------------------
// validateDealerTxtLine483
// ---------------------------------------------------------------------------

describe('Dealer TXT Layout 483 — validateDealerTxtLine483', () => {
  it('aceita linha válida de 483 caracteres', () => {
    const line = buildDealerTxtLine483(defaultParams);
    const issues = validateDealerTxtLine483(line);
    expect(issues).toHaveLength(0);
  });

  it('rejeita linha com tamanho errado', () => {
    const issues = validateDealerTxtLine483('FP' + ' '.repeat(100));
    expect(issues.some((i) => i.code === 'INVALID_DEALER_LINE_LENGTH')).toBe(true);
  });

  it('rejeita linha sem prefixo FP', () => {
    let line = buildDealerTxtLine483(defaultParams);
    line = 'XX' + line.substring(2);
    const issues = validateDealerTxtLine483(line);
    expect(issues.some((i) => i.code === 'INVALID_DEALER_BATCH_TYPE')).toBe(true);
  });

  it('rejeita conta com pontos no TXT', () => {
    let line = buildDealerTxtLine483(defaultParams);
    // Inject a dotted account at position 16-35
    const injected = line.substring(0, 15) + '6.1.1.01.002    ' + '    ' + line.substring(35);
    // Need to keep 483 length
    const fixed = injected.substring(0, 483);
    const issues = validateDealerTxtLine483(fixed);
    expect(issues.some((i) => i.code === 'INVALID_DEALER_ACCOUNT_FORMAT')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Legacy exports still work
// ---------------------------------------------------------------------------

describe('Dealer TXT Layout — Legacy backward compat', () => {
  const legacyOptions = {
    batchType: 'FP',
    dealerCompanyField: '01',
    dealerBranchField: '001',
    accountingDate: '2026-04-30',
    expectedLineLength: 453,
    strictLength: false,
  };

  it('formatDealerAccount still returns trimmed account', () => {
    expect(formatDealerAccount('2.1.1.02.001')).toBe('2.1.1.02.001');
  });

  it('formatMoneyDealer still returns dot-decimal', () => {
    expect(formatMoneyDealer(123456, 18)).toBe('           1234.56');
  });

  it('buildDealerTxtLine still returns 453-char line', () => {
    const entry = {
      dc: 'D',
      accountCode: '6.1.1.01.002',
      centerCode: '001000',
      amountCents: 150000,
      history: 'FOLHA DE PAGAMENTO REF 04/2026',
    };
    const { line } = buildDealerTxtLine(entry, legacyOptions);
    expect(line.length).toBe(453);
  });
});
