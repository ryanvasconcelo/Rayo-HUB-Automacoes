import { describe, expect, it } from 'vitest';
import {
  exportDealerTxt,
  runFolhaDealerEngine,
  bragaVeiculosConfig,
  buildBragaRowsFortes,
  DEALER_LINE_LENGTH,
  ValidationCodes,
} from '../src/lib/folha-dealer/index.js';

describe('Dealer TXT Exporter — Layout 483', () => {
  const validOptions = {
    dealerCompanyField: '01',
    dealerBranchField: '001',
    accountingDate: '2026-04-30',
    requireApproval: true,
    accountMappings: bragaVeiculosConfig.accountMappings,
  };

  function getApprovedRunResult() {
    const runResult = runFolhaDealerEngine({
      config: bragaVeiculosConfig,
      sourceRows: buildBragaRowsFortes(),
      competence: '2026-04',
    });
    runResult.approval = { user: 'teste', timestamp: new Date() };
    return runResult;
  }

  // -----------------------------------------------------------------------
  // Bloqueio por dealerLotAccountCode null
  // -----------------------------------------------------------------------

  it('bloqueia com MISSING_DEALER_LOT_ACCOUNT_CODE quando dealerLotAccountCode é null', () => {
    const runResult = getApprovedRunResult();
    const result = exportDealerTxt(runResult, validOptions);

    // Todos os dealerLotAccountCode estão null no config atual
    expect(result.content).toBeNull();
    const hasMissing = result.issues.some(
      (i) => i.code === ValidationCodes.MISSING_DEALER_LOT_ACCOUNT_CODE
    );
    expect(hasMissing).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Sucesso com dealerLotAccountCode preenchido
  // -----------------------------------------------------------------------

  function getOptionsWithLotCodes() {
    // Criar cópia dos mappings com dealerLotAccountCode fake preenchido
    const mappings = bragaVeiculosConfig.accountMappings.map((m, idx) => ({
      ...m,
      dealerLotAccountCode: `${String(idx + 1).padStart(12, '0')}`,
    }));
    return {
      ...validOptions,
      accountMappings: mappings,
    };
  }

  it('exporta TXT com CRLF e uma linha por entry', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    expect(result.issues).toHaveLength(0);
    expect(result.content).toBeDefined();
    expect(result.lineCount).toBe(runResult.entries.length);

    const lines = result.content.split('\r\n');
    // trailing CRLF adds empty element
    expect(lines[lines.length - 1]).toBe('');
    expect(lines.length).toBe(runResult.entries.length + 1);
  });

  it('todas as linhas têm exatamente 483 caracteres', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((line) => {
      expect(line.length).toBe(DEALER_LINE_LENGTH);
    });
  });

  it('entry D preenche débito e deixa crédito vazio', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    const debitEntry = runResult.entries.find((e) => e.dc === 'D');
    expect(debitEntry).toBeDefined();

    const idx = runResult.entries.indexOf(debitEntry);
    const line = lines[idx];

    // Pos 16-35: conta débito preenchida
    expect(line.substring(15, 35).trim()).not.toBe('');
    // Pos 63-82: conta crédito vazia
    expect(line.substring(62, 82).trim()).toBe('');
  });

  it('entry C preenche crédito e deixa débito vazio', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    const creditEntry = runResult.entries.find((e) => e.dc === 'C');
    expect(creditEntry).toBeDefined();

    const idx = runResult.entries.indexOf(creditEntry);
    const line = lines[idx];

    // Pos 16-35: conta débito vazia
    expect(line.substring(15, 35).trim()).toBe('');
    // Pos 63-82: conta crédito preenchida
    expect(line.substring(62, 82).trim()).not.toBe('');
  });

  it('nenhuma conta com pontos aparece no TXT', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    if (result.content) {
      expect(result.content).not.toContain('6.1.1');
      expect(result.content).not.toContain('2.1.1');
      expect(result.content).not.toContain('1.1.4');
    }
  });

  it('sequencial incrementa corretamente', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    lines.forEach((line, i) => {
      const seq = line.substring(109, 117).trim();
      expect(seq).toBe(String(i + 1));
    });
  });

  it('data 1 e data 2 corretas nas posições 372-391', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    lines.forEach((line) => {
      expect(line.substring(371, 381)).toBe('30/04/2026');
      expect(line.substring(381, 391)).toBe('30/04/2026');
    });
  });

  it('valor com vírgula e zeros nas posições 412-429', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    lines.forEach((line) => {
      const valor = line.substring(411, 429);
      expect(valor).toMatch(/^\d+,\d{2}$/);
    });
  });

  it('empresa 01 e filial 001 em todas as linhas', () => {
    const runResult = getApprovedRunResult();
    const opts = getOptionsWithLotCodes();
    const result = exportDealerTxt(runResult, opts);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    lines.forEach((line) => {
      expect(line.substring(10, 12)).toBe('01');
      expect(line.substring(12, 15)).toBe('001');
    });
  });

  // -----------------------------------------------------------------------
  // Bloqueios existentes mantidos
  // -----------------------------------------------------------------------

  it('bloqueia se runResult estiver blocked', () => {
    const runResult = getApprovedRunResult();
    runResult.status = 'blocked';
    const result = exportDealerTxt(runResult, validOptions);
    expect(result.content).toBeNull();
    expect(result.issues.some((i) => i.code === 'DEALER_TXT_EXPORT_BLOCKED')).toBe(true);
  });

  it('bloqueia se houver blocker na lista de issues do run', () => {
    const runResult = getApprovedRunResult();
    runResult.issues.push({ severity: 'blocker', code: 'FAKE_BLOCKER' });
    const result = exportDealerTxt(runResult, validOptions);
    expect(result.content).toBeNull();
  });

  it('bloqueia sem aprovação quando requireApproval = true', () => {
    const runResult = getApprovedRunResult();
    delete runResult.approval;
    const result = exportDealerTxt(runResult, validOptions);
    expect(result.content).toBeNull();
    expect(result.issues.some((i) => i.code === 'DEALER_TXT_APPROVAL_REQUIRED')).toBe(true);
  });

  it('permite exportar sem aprovação quando requireApproval = false', () => {
    const runResult = getApprovedRunResult();
    delete runResult.approval;
    const opts = { ...getOptionsWithLotCodes(), requireApproval: false };
    const result = exportDealerTxt(runResult, opts);
    // Still blocks because of lot codes, but no approval issue
    const hasApprovalIssue = result.issues.some(
      (i) => i.code === 'DEALER_TXT_APPROVAL_REQUIRED'
    );
    expect(hasApprovalIssue).toBe(false);
  });

  it('falha se dealerCompanyField, dealerBranchField ou accountingDate ausente', () => {
    const runResult = getApprovedRunResult();
    const r1 = exportDealerTxt(runResult, { ...validOptions, dealerCompanyField: '' });
    expect(r1.issues.some((i) => i.code === 'DEALER_TXT_MISSING_OPTION')).toBe(true);

    const r2 = exportDealerTxt(runResult, { ...validOptions, dealerBranchField: '' });
    expect(r2.issues.some((i) => i.code === 'DEALER_TXT_MISSING_OPTION')).toBe(true);

    const r3 = exportDealerTxt(runResult, { ...validOptions, accountingDate: '' });
    expect(r3.issues.some((i) => i.code === 'DEALER_TXT_MISSING_OPTION')).toBe(true);
  });

  it('falha se não houver entries', () => {
    const runResult = getApprovedRunResult();
    runResult.entries = [];
    const result = exportDealerTxt(runResult, validOptions);
    expect(result.content).toBeNull();
    expect(result.issues.some((i) => i.code === 'DEALER_TXT_EMPTY')).toBe(true);
  });
});
