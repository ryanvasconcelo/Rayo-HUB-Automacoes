/**
 * journal-builder.js — Gera AccountingEntry[] a partir de itens consolidados.
 *
 * Pipeline por item consolidado:
 * 1. Ignora item com amountCents === 0.
 * 2. Ignora eventos informativos.
 * 3. Busca de-para de conta (account mapping).
 * 4. Busca de-para de centro (center mapping).
 * 5. Aplica regra de centro por classe de conta:
 *    - Classe 1 ou 2 → centro removido.
 *    - Classe 3+ → centro obrigatório.
 * 6. Gera AccountingEntry com batchType, history, dc, account, center, amount.
 *
 * NÃO sintetiza contrapartida ausente.
 */

import {
  BATCH_TYPE,
  INFORMATIVE_EVENT_CODES,
  EVENT_100_REQUIRED_ACCOUNT,
  ValidationCodes,
  buildHistory,
  accountRequiresCenter,
} from './contracts.js';
import { mapCenter } from './center-mapper.js';
import { mapAccount } from './account-mapper.js';

/**
 * @param {object} params
 * @param {object[]} params.consolidatedItems — ConsolidatedPayrollItem[]
 * @param {object} params.config — empresa config com centerMappings e accountMappings
 * @param {string} params.competence — YYYY-MM
 * @returns {{ entries: object[], issues: object[] }}
 */
export function buildJournal({ consolidatedItems, config, competence }) {
  const entries = [];
  const issues = [];
  const history = buildHistory(competence);

  for (const item of consolidatedItems) {
    // ------ Zero value → skip + warning ------
    if (item.amountCents === 0) {
      issues.push({
        code: ValidationCodes.ZERO_VALUE_IGNORED,
        severity: 'warning',
        message: `Item com valor zero ignorado: lotação ${item.lotacaoCode}, evento ${item.eventCode}.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
      continue;
    }

    // ------ Informative event → skip + warning ------
    const isInformative = INFORMATIVE_EVENT_CODES.has(item.eventCode) || 
                          (config.informativeEventCodes && config.informativeEventCodes.includes(item.eventCode));

    if (isInformative) {
      issues.push({
        code: ValidationCodes.INFORMATIVE_EVENT_IGNORED,
        severity: 'warning',
        message: `Evento informativo ${item.eventCode} ignorado na geração de lançamentos.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
      continue;
    }

    // ------ Negative value without policy → blocker ------
    if (item.amountCents < 0) {
      issues.push({
        code: ValidationCodes.NEGATIVE_VALUE_WITHOUT_POLICY,
        severity: 'blocker',
        message: `Valor negativo sem política definida: lotação ${item.lotacaoCode}, evento ${item.eventCode}.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, amountCents: item.amountCents, competence },
      });
      continue;
    }

    // ------ Account mapping ------
    const accountLines = mapAccount(item.eventCode, item.companyId, config.accountMappings);

    if (accountLines.length === 0) {
      issues.push({
        code: ValidationCodes.MISSING_ACCOUNT_MAPPING,
        severity: 'blocker',
        message: `Evento ${item.eventCode} sem de-para contábil.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
      continue;
    }

    // ------ Event 100 account validation ------
    if (item.eventCode === '100') {
      const badAccount = accountLines.find(
        (line) => line.dealerAccountCode !== EVENT_100_REQUIRED_ACCOUNT
      );
      if (badAccount) {
        issues.push({
          code: ValidationCodes.EVENT_100_ACCOUNT_MISMATCH,
          severity: 'blocker',
          message: `Evento 100 deve usar conta ${EVENT_100_REQUIRED_ACCOUNT}, mas encontrou ${badAccount.dealerAccountCode}.`,
          context: { eventCode: '100', expected: EVENT_100_REQUIRED_ACCOUNT, found: badAccount.dealerAccountCode, competence },
        });
        continue;
      }
    }

    // ------ Center mapping ------
    const centerResult = mapCenter(item.lotacaoCode, item.companyId, config.centerMappings);

    if (!centerResult) {
      issues.push({
        code: ValidationCodes.MISSING_CENTER_MAPPING,
        severity: 'blocker',
        message: `Lotação ${item.lotacaoCode} sem de-para de centro.`,
        context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, competence },
      });
    }

    // ------ Generate entries for each account line ------
    for (const accountLine of accountLines) {
      const requiresCenter = accountRequiresCenter(accountLine.dealerAccountCode);
      let centerCode;

      if (requiresCenter) {
        if (centerResult) {
          centerCode = centerResult.centerCode;
        } else {
          // MISSING_CENTER_MAPPING already emitted above.
          // Also emit MISSING_REQUIRED_CENTER for the specific account.
          issues.push({
            code: ValidationCodes.MISSING_REQUIRED_CENTER,
            severity: 'blocker',
            message: `Conta ${accountLine.dealerAccountCode} exige centro, mas lotação ${item.lotacaoCode} não tem centro mapeado.`,
            context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, accountCode: accountLine.dealerAccountCode, competence },
          });
          centerCode = undefined;
        }
      } else {
        // Contas 1/2 → sem centro, mesmo que tenha mapping
        if (centerResult) {
          issues.push({
            code: ValidationCodes.CENTER_REMOVED_FROM_BALANCE_ACCOUNT,
            severity: 'warning',
            message: `Centro ${centerResult.centerCode} removido da conta ${accountLine.dealerAccountCode} (classe 1/2).`,
            context: { lotacaoCode: item.lotacaoCode, eventCode: item.eventCode, accountCode: accountLine.dealerAccountCode, centerCode: centerResult.centerCode, competence },
          });
        }
        centerCode = undefined;
      }

      entries.push({
        companyId: item.companyId,
        competence,
        batchType: BATCH_TYPE,
        history,
        dc: accountLine.dc.toUpperCase(),
        accountCode: accountLine.dealerAccountCode,
        centerCode,
        amountCents: item.amountCents,
        lotacaoCode: item.lotacaoCode,
        eventCode: item.eventCode,
      });
    }
  }

  return { entries, issues };
}
