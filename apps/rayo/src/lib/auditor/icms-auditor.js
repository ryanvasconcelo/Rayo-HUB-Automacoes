/**
 * RAYO HUB — Motor de Auditoria ICMS v2
 * Análise Combinatória de CST + Alíquotas Interestaduais + Operações Especiais.
 *
 * v2 — Novo nesta versão:
 *   - Integração com knowledge-base.js (alíquotas interestaduais, CFOPs especiais, ST/decretos AM)
 *   - Operações especiais → CST X90, zera Base/Alíquota/Valor ICMS
 *   - Coluna "CST Antigo" preservada no correctedData
 *   - Alíquota calculada a partir de CFOP de origem × destino AM
 *   - Chave composta NCM+Descrição com fallback para NCM puro
 *   - NCM parcial: lookup por 8, 6 e 4 dígitos
 *
 * GUARDRAIL SOP-IA: Este arquivo é CORE puro — sem imports de UI/React.
 * Toda lógica aqui é testável via vitest sem navegador.
 */

import {
    CFOP_EXCECAO_AMARELA,
    CFOP_DEVOLUCAO,
    CFOP_OPERACOES_ESPECIAIS,
    CFOP_EXCECOES_CREDITO,
    resolverAliquota,
    NCM_ST_LEI_6108_22,
    NCM_CESTA_BASICA_PREFIXOS,
    ALIQUOTA_ESPECIFICA_AM,
} from './knowledge-base.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizarDescricao = (desc) =>
    String(desc || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/\s+/g, ' ');

const parseBRLNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).replace(/[R$\s]/gi, '');
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

/**
 * Análise Combinatória de CST — ignora o 1º dígito (Origem).
 * Kickoff: "O 1º dígito diz a origem. Pra gente não significa muita coisa."
 */
const compararCstCombinatorio = (natureza, cstOriginal, cstBase) => {
    const raizOriginal = String(cstOriginal).padStart(3, '0').slice(-2);
    const raizBase = String(cstBase).padStart(3, '0').slice(-2);

    if (raizOriginal === raizBase) return { status: 'ok' };

    // Kickoff: "00 e 20 são a mesma tribo."
    const grupoTributadoComercio = ['00', '20'];
    // Kickoff: "Indústria: 00, 10, 20, 30 e 70 participam do mesmo bolo combinatório."
    const grupoTributadoIndustria = ['00', '10', '20', '30', '70'];

    // Grupo de Isenções e Não Tributados
    const grupoIsentos = ['40', '41', '50', '90'];

    // Grupo de Substituição Tributária Cobrada / Monofásico
    const grupoSTeMonofasico = ['60', '61'];

    const grupoValido = (natureza === 'industria') ? grupoTributadoIndustria : grupoTributadoComercio;

    // Regra 1: Se ambos estão no mesmo grupo de ISENÇÃO
    if (grupoIsentos.includes(raizOriginal) && grupoIsentos.includes(raizBase)) {
        return {
            status: 'alerta',
            detalhe: `Variação Combinatória: esperava raiz ${raizBase}, recebida ${raizOriginal}. Ambas pertencem à mesma tribo de Isentos/Não Tributados.`,
        };
    }

    // Regra 2: Se ambos estão no mesmo grupo de SUBSTITUIÇÃO / MONOFÁSICO
    if (grupoSTeMonofasico.includes(raizOriginal) && grupoSTeMonofasico.includes(raizBase)) {
        return {
            status: 'alerta',
            detalhe: `Variação Combinatória: esperava raiz ${raizBase}, recebida ${raizOriginal}. Ambas pertencem à tribo de imposto cobrado/retido anteriormente.`,
        };
    }

    // Regra 3 (Antiga): Se ambos estão no grupo TRIBUTADO (Comércio x Indústria)
    if (grupoValido.includes(raizOriginal) && grupoValido.includes(raizBase)) {
        return {
            status: 'alerta',
            detalhe: `Variação Combinatória: esperava raiz ${raizBase}, recebida ${raizOriginal}. Ambas são do grupo Tributado (${natureza}).`,
        };
    }

    return {
        status: 'erro',
        detalhe: `Divergência Crítica: a regra exige equivalência à raiz CST ${raizBase}, mas foi recebida ${raizOriginal}.`,
    };
};

/**
 * Recalcula a Base de Cálculo do ICMS:
 * Base = Valor Item − Descontos + Despesas Acessórias + Frete + Seguro
 * Aplica % de redução se a regra do e-Auditoria determinar.
 * Zera se CST esperado for 60 (ST cobrado anteriormente).
 */
export const calcularBaseCerta = (linha, regra, cstRaizEsperado) => {
    // CSTs que exigem Base de Cálculo e ICMS zerados na NF (ST revenda, Isenção, Monofásico)
    const cstsSemBase = ['60', '61', '40', '41', '50'];
    if (cstsSemBase.includes(cstRaizEsperado)) return 0.00;

    const vlItem = parseBRLNumber(linha['Valor Total Item']);
    const desc = parseBRLNumber(linha['Descontos']);
    const despAc = parseBRLNumber(linha['Despesas Acessórias']);
    const frete = parseBRLNumber(linha['Valor Frete']);
    const seguro = parseBRLNumber(linha['Valor Seguro'])
        || parseBRLNumber(linha['Seguro'])
        || parseBRLNumber(linha['VL_SEG']) || 0;

    let base = vlItem - desc + despAc + frete + seguro;

    if (regra?.['% RED. BASE DE CÁLCULO ICMS']) {
        const pct = parseBRLNumber(regra['% RED. BASE DE CÁLCULO ICMS']);
        if (pct > 0) base = base * ((100 - pct) / 100);
    }

    return base;
};

// ─── Índice de NCM com suporte a prefixo parcial ──────────────────────────────
/**
 * Constrói o índice do e-Auditoria com chave primária = NCM completo (8 d)
 * e entradas auxiliares para prefixos de 6 e 4 dígitos.
 * Também indexa chave composta NCM|descricao para desambiguar.
 */
const construirBaseMap = (eAuditoriaRows) => {
    const map = new Map(); // key: ncm8 | ncm6 | ncm4 | ncm8|desc → regra
    eAuditoriaRows.forEach(row => {
        const ncm = String(row['NCM'] || '').replace(/\D/g, '');
        if (!ncm) return;

        // Função auxiliar para inicializar e dar push no array do map
        const pushToMap = (key, item) => {
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        };

        // Chave principal: NCM completo
        pushToMap(ncm, row);

        // Chave composta com descrição (desambiguação)
        const desc = normalizarDescricao(row['Descrição do Produto'] || row['Descrição'] || '');
        if (desc) {
            const chaveComposta = `${ncm}|${desc}`;
            pushToMap(chaveComposta, row);
        }

        // Prefixos parciais como fallback
        if (ncm.length >= 6) {
            const p6 = ncm.slice(0, 6);
            pushToMap(p6, row);
        }
        if (ncm.length >= 4) {
            const p4 = ncm.slice(0, 4);
            pushToMap(p4, row);
        }
    });
    return map;
};

/**
 * Se houver múltiplas regras para o mesmo NCM/Prefixo, e nenhuma bater a descrição exata,
 * o desempate é feito pela Legislação do Amazonas:
 * Se o NCM está na lei de ST (Decreto 6108), escolhemos a regra de ST.
 * Senão, escolhemos Tributação Normal.
 * Adicionalmente, se o cliente informou um CST válido dentre as opções, honramos a escolha dele.
 */
const resolverDesambiguacaoST = (regrasArray, ncmBrutoFormatado, cstOriginalLivrao) => {
    if (!regrasArray || regrasArray.length === 0) return null;
    if (regrasArray.length === 1) return regrasArray[0]; // Sem ambiguidade

    const ncmLimpo = String(ncmBrutoFormatado || '').replace(/\D/g, '');
    const raizLivrao = String(cstOriginalLivrao || '').padStart(3, '0').slice(-2);

    const isStOficial = NCM_ST_LEI_6108_22.has(ncmLimpo)
        || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 6))
        || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 4));

    if (isStOficial) {
        const stRules = regrasArray.filter(r => {
            const cstBase = String(r['CST/CSOSN'] || '').padStart(3, '0').slice(-2);
            return ['10', '30', '60', '70', '90'].includes(cstBase);
        });
        if (stRules.length > 0) {
            const matchCli = stRules.find(r => String(r['CST/CSOSN']).padStart(3, '0').slice(-2) === raizLivrao);
            return matchCli || stRules[0];
        }
    } else {
        const normRules = regrasArray.filter(r => {
            const cstBase = String(r['CST/CSOSN'] || '').padStart(3, '0').slice(-2);
            return ['00', '20', '40', '50', '51'].includes(cstBase);
        });
        if (normRules.length > 0) {
            const matchCli = normRules.find(r => String(r['CST/CSOSN']).padStart(3, '0').slice(-2) === raizLivrao);
            return matchCli || normRules[0];
        }
    }

    const fallCli = regrasArray.find(r => String(r['CST/CSOSN']).padStart(3, '0').slice(-2) === raizLivrao);
    return fallCli || regrasArray[0];
};

/**
 * Lookup com prioridade: NCM+Desc > NCM 8 dígitos > NCM 6 dígitos > NCM 4 dígitos
 */
const buscarRegra = (baseMap, ncmLimpo, descricaoLivrao, ncmBruto, cstOriginal) => {
    const descNorm = normalizarDescricao(descricaoLivrao);

    if (descNorm) {
        const chave = `${ncmLimpo}|${descNorm}`;
        if (baseMap.has(chave)) return baseMap.get(chave)[0];
    }

    if (baseMap.has(ncmLimpo)) return resolverDesambiguacaoST(baseMap.get(ncmLimpo), ncmBruto, cstOriginal);
    const p6 = ncmLimpo.slice(0, 6);
    if (baseMap.has(p6)) return resolverDesambiguacaoST(baseMap.get(p6), ncmBruto, cstOriginal);
    const p4 = ncmLimpo.slice(0, 4);
    if (baseMap.has(p4)) return resolverDesambiguacaoST(baseMap.get(p4), ncmBruto, cstOriginal);

    return null;
};

// ─── Motor Principal ──────────────────────────────────────────────────────────

/**
 * @param {Array}  alterdataRows   - Linhas do Livrão Bruto (parseAlterdata)
 * @param {Array}  eAuditoriaRows  - Regras do e-Auditoria (parseEAuditoria)
 * @param {Object} perfil          - { natureza: 'comercio'|'industria', regime: string }
 * @returns {{ report, correctedData, modifiedCells, ncmSemCobertura }}
 */
export const runAudit = (alterdataRows, eAuditoriaRows, perfil) => {
    const report = [];
    const ncmSemCobertura = new Map();
    const correctedData = JSON.parse(JSON.stringify(alterdataRows));
    const modifiedCells = new Map(); // rowIndex → Set<fieldName>

    const baseMap = construirBaseMap(eAuditoriaRows);

    correctedData.forEach((row, index) => {
        const numLinha = index + 2; // +2: cabeçalho na linha 1 do Excel

        const ncmBruto = row['Classificação'];
        if (!ncmBruto) return;

        const ncmLimpo = String(ncmBruto).replace(/\D/g, '');
        const cstOriginal = String(row['CST ICMS'] || '').padStart(3, '0');
        const cfopOriginal = String(row['CFOP'] || '').replace(/\D/g, '');
        const raizInformada = cstOriginal.slice(-2);
        const descricaoLivrao = row['Descrição'] || row['Nome do Produto'] || '';
        const ufOrigem = row['UF Emitente'] || row['UF Origem'] || row['Estado Emitente'] || '';

        // ── Classifica tipo de operação ─────────────────────────────────────
        const isOperacaoEspecial = CFOP_OPERACOES_ESPECIAIS.has(cfopOriginal) && !CFOP_EXCECOES_CREDITO.has(cfopOriginal);
        const isExcecaoAmarela = CFOP_EXCECAO_AMARELA.has(cfopOriginal);
        const isDevolucao = CFOP_DEVOLUCAO.has(cfopOriginal);

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO ESPECIAL — Operações que não são aquisição pra venda
        // Reunião: "Transferências, uso/consumo, brinde, comodato → CST 90,
        //           zerar base de cálculo, zerar alíquota e ICMS"
        // ════════════════════════════════════════════════════════════════════
        if (isOperacaoEspecial) {
            const digitoOrigem = cstOriginal.charAt(0) || '0';
            const cstNovo = digitoOrigem + '90';
            const bcOriginal = row['ICMS Base item'];

            // Nomes possíveis de colunas — inclui nomes do Livrão Alterdata
            const campoAliqEsp = Object.keys(row).find(k => ['Alíquota ICMS', 'Aliquota ICMS', 'ICMS Aliquota', '% ICMS NF'].includes(k));
            const campoVlIcmsEsp = Object.keys(row).find(k => ['Valor ICMS', 'ICMS Valor', 'VL_ICMS', 'ICMS Valor item'].includes(k));
            const aliqOriginal = campoAliqEsp ? row[campoAliqEsp] : undefined;
            const vlIcmsOriginal = campoVlIcmsEsp ? row[campoVlIcmsEsp] : undefined;

            // Registrar CST antigo antes de sobrescrever
            row['CST Antigo'] = cstOriginal;

            // Aplicar zeragem
            row['CST ICMS'] = cstNovo;
            row['ICMS Base item'] = 0;
            if (campoAliqEsp) row[campoAliqEsp] = 0;
            if (campoVlIcmsEsp) row[campoVlIcmsEsp] = 0;

            // Registrar células modificadas
            if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
            ['CST ICMS', 'ICMS Base item'].forEach(f => modifiedCells.get(index).add(f));

            report.push({
                linha: numLinha,
                ncm: ncmBruto,
                cst: cstOriginal,
                cfop: cfopOriginal,
                severidade: isExcecaoAmarela ? 'alerta' : 'info',
                motivo: 'Operação Especial — CST 90 Aplicado',
                detalhe: `CFOP ${cfopOriginal} = operação não relacionada à aquisição para venda (uso/consumo, comodato, brinde etc.). CST alterado de ${cstOriginal} → ${cstNovo}. Base ICMS, alíquota e valor zerados.`,
                correcaoAplicada: {
                    campo: 'CST ICMS / Base / Alíquota / Valor ICMS',
                    valorAntes: `CST: ${cstOriginal} | Base: ${bcOriginal}`,
                    valorDepois: `CST: ${cstNovo} | Base: 0 | Alíquota: 0% | ICMS: 0`,
                },
            });
            return; // Linha processada — não auditamos CST/alíquota nessas linhas
        }

        // ── Busca regra no e-Auditoria ──────────────────────────────────────
        const regra = buscarRegra(baseMap, ncmLimpo, descricaoLivrao, ncmBruto, cstOriginal);

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 0 — NCM sem cobertura no e-Auditoria
        // ════════════════════════════════════════════════════════════════════
        if (!regra) {
            if (!ncmSemCobertura.has(ncmBruto)) {
                ncmSemCobertura.set(ncmBruto, { ncm: ncmBruto, linhas: [], descricao: descricaoLivrao });
            }
            ncmSemCobertura.get(ncmBruto).linhas.push(numLinha);

            report.push({
                linha: numLinha,
                ncm: ncmBruto,
                cst: cstOriginal,
                cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'NCM não auditado — Análise Manual Obrigatória',
                detalhe: 'Este NCM não retornou na base do e-Auditoria. A tributação não pode ser validada automaticamente. Auditoria manual obrigatória antes do SPED.',
                correcaoAplicada: null,
            });
            return;
        }

        const cstBase = String(regra['CST/CSOSN'] || '').padStart(3, '0');
        const raizEsperada = cstBase.slice(-2);

        // Preservar CST antigo e Descrição do e-Auditoria no correctedData (novas colunas)
        row['CST Antigo'] = cstOriginal;
        // e-Auditoria exporta cabeçalhos em maiúsculas: "DESCRIÇÃO", "BASE LEGAL ICMS"
        row['Desc_eAuditoria'] = regra['DESCRIÇÃO'] || regra['Descrição do Produto'] || regra['Descrição'] || regra['DESCRICAO'] || '';

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 1 — Matemática da Base de Cálculo (tolerância R$0,05)
        // ════════════════════════════════════════════════════════════════════
        const bcMapeada = calcularBaseCerta(row, regra, raizEsperada);
        const bcInformada = parseBRLNumber(row['ICMS Base item']);
        let erroMatematico = false;

        if (Math.abs(bcMapeada - bcInformada) > 0.05) {
            erroMatematico = true;
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'Erro Matemático na Base de Cálculo',
                detalhe: `Base calculada: R$ ${bcMapeada.toFixed(2)} | Base informada: R$ ${bcInformada.toFixed(2)} | Diferença: R$ ${Math.abs(bcMapeada - bcInformada).toFixed(2)}.`,
                correcaoAplicada: null,
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 1b — Alíquota e Valor ICMS
        // Fonte de alíquota: CFOP de origem × destino AM + alíquotas específicas AM
        // ════════════════════════════════════════════════════════════════════
        const { aliquota: aliquotaCorreta, origem: origemCfop } = resolverAliquota(cfopOriginal, ufOrigem);
        // Verifica se NCM tem alíquota específica no AM (perfumaria 29%, armas 25%, etc.)
        const aliqEspecifica = ALIQUOTA_ESPECIFICA_AM[ncmLimpo.slice(0, 4)] ?? null;
        const aliquotaFinal = aliqEspecifica ?? aliquotaCorreta;

        const campoAliquota = Object.keys(row).find(k => ['Alíquota ICMS', 'Aliquota ICMS', 'ICMS Aliquota', '% ICMS NF'].includes(k));
        const campoVlIcms = Object.keys(row).find(k => ['Valor ICMS', 'ICMS Valor', 'VL_ICMS', 'ICMS Valor item'].includes(k));
        const aliquotaInformada = campoAliquota ? parseBRLNumber(row[campoAliquota]) : null;

        if (aliquotaFinal !== null && aliquotaInformada !== null) {
            // Pular validação de alíquota em casos sem base:
            // - raiz '61' = Monofásico (combustíveis) → ICMS recolhido na refinaria, alíquota 0% é correto
            // - bcMapeada === 0 → produto ST/isento → alíquota irrelevante quando base é zero
            const skipAliquotaCheck = raizEsperada === '61' || bcMapeada === 0;
            const aliqInformNorm = aliquotaInformada > 1 ? aliquotaInformada / 100 : aliquotaInformada;
            if (!skipAliquotaCheck && Math.abs(aliqInformNorm - aliquotaFinal) > 0.001) {
                report.push({
                    linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                    aliquotaAplicada: aliquotaFinal,
                    icmsEsperado: parseBRLNumber(row['ICMS Base item']) * aliquotaFinal,
                    severidade: 'erro',
                    motivo: 'Alíquota ICMS Divergente',
                    detalhe: `Origem: ${origemCfop}${aliqEspecifica ? ' (alíquota específica AM)' : ''}. Esperada: ${(aliquotaFinal * 100).toFixed(0)}%, informada: ${(aliqInformNorm * 100).toFixed(0)}%.`,
                    correcaoAplicada: null,
                });
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 2 — ST Invertido (bidirecional)
        // ════════════════════════════════════════════════════════════════════
        if (raizInformada === '60' && raizEsperada !== '60') {
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                esperado: cstBase,
                severidade: 'erro',
                motivo: 'ST Indevido — Tributação Irregular',
                detalhe: `CST informado 0${raizInformada} (ST cobrado anteriormente), mas e-Auditoria indica tributação normal (CST ${cstBase}). Crédito pode estar sendo sonegado. Verificação urgente antes do SPED.`,
                correcaoAplicada: null,
            });
        }

        // VALIDAÇÃO 2b — NCM sob ST conforme Lei 6.108/22 mas e-Auditoria indica tributado
        const ncmNaST = NCM_ST_LEI_6108_22.has(ncmLimpo) ||
            NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 6)) ||
            NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 4));
        if (raizEsperada !== '60' && raizEsperada !== '61' && ncmNaST) {
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'alerta',
                motivo: 'NCM sob ST (Lei 6.108/22) — Verificar CST',
                detalhe: `NCM ${ncmBruto} consta como Substituição Tributária na Lei 6.108/22 (AM). O e-Auditoria indica CST ${cstBase} (tributado). Confirme se a mercadoria está sujeita a ST no período.`,
                correcaoAplicada: null,
            });
        }

        // VALIDAÇÃO 2c — Produto da cesta básica (possível isenção Lei 6.215/23)
        const ncmCestaBasica = NCM_CESTA_BASICA_PREFIXOS.has(ncmLimpo.slice(0, 4));
        if (ncmCestaBasica && raizEsperada !== '40' && raizEsperada !== '41') {
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'alerta',
                motivo: 'Possível Isenção Cesta Básica (Lei 6.215/23)',
                detalhe: `NCM ${ncmBruto} pode ser produto da cesta básica isento de ICMS no AM conforme Lei 6.215/23. Confirme se o produto se enquadra na lista de isenção antes de tributar.`,
                correcaoAplicada: null,
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 3 — CFOP de Devolução
        // ════════════════════════════════════════════════════════════════════
        if (isDevolucao) {
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'CFOP de Devolução — Verificação Obrigatória',
                detalhe: `CFOP ${cfopOriginal} é devolução. Verifique se o ICMS está sendo corretamente creditado e se o CST condiz com a operação original devolvida.`,
                correcaoAplicada: null,
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 4 — Análise Combinatória de CST
        // ════════════════════════════════════════════════════════════════════
        const resultadoCst = compararCstCombinatorio(perfil.natureza, cstOriginal, cstBase);

        if (resultadoCst.status !== 'ok') {
            if (isExcecaoAmarela) {
                report.push({
                    linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                    esperado: cstBase, severidade: 'alerta',
                    motivo: 'Operação de Exceção (Uso/Consumo ou Comodato)',
                    detalhe: `CST ${cstOriginal} difere da regra (${cstBase}), mas CFOP ${cfopOriginal} indica exceção contextual. Análise humana necessária.`,
                    correcaoAplicada: null,
                });
            } else {
                report.push({
                    linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                    esperado: cstBase,
                    aliquotaAplicada: aliquotaFinal,
                    icmsEsperado: parseBRLNumber(row['ICMS Base item']) * (aliquotaFinal || 0),
                    severidade: resultadoCst.status,
                    motivo: resultadoCst.status === 'erro'
                        ? 'CST divergente da Base Auditada (Erro Crítico)'
                        : 'Variação de CST Tributável (Atenção)',
                    detalhe: `CFOP ${cfopOriginal}: ${resultadoCst.detalhe}`,
                    correcaoAplicada: null,
                });
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // AUTO-CORREÇÃO — Só opera em faturamentos normais (não devolução/exceção)
        // ════════════════════════════════════════════════════════════════════
        const podeCorrigir = !isExcecaoAmarela && !isDevolucao;

        if (podeCorrigir) {
            // Corrigir base matemática
            if (erroMatematico) {
                const valorAntes = row['ICMS Base item'];
                row['ICMS Base item'] = Number(bcMapeada.toFixed(2));
                if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
                modifiedCells.get(index).add('ICMS Base item');
                const ap = report.findLast(r => r.linha === numLinha && r.motivo.includes('Matemático'));
                if (ap) ap.correcaoAplicada = { campo: 'ICMS Base item', valorAntes, valorDepois: row['ICMS Base item'] };
            }

            // Corrigir CST crítico ou Variação Tributável (preserva dígito origem)
            if (resultadoCst.status === 'erro' || resultadoCst.status === 'alerta') {
                const digitoOrigem = cstOriginal.charAt(0) || '0';
                const cstCorrigido = digitoOrigem + raizEsperada;
                const valorAntesCst = row['CST ICMS'];

                // Se for *alerta*, só corrige se a raiz original não estiver validada na mesma tribo do esperado
                // (Na verdade, o Hotfix 2 definiu que mesmos grupos = Tolerância OK pra nós mas com "Atenção" no texto) 
                const deveSobrescrever = resultadoCst.status === 'erro';

                if (deveSobrescrever) {
                    row['CST ICMS'] = cstCorrigido;
                    if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
                    modifiedCells.get(index).add('CST ICMS');
                    const ap = report.findLast(r => r.linha === numLinha && (r.motivo.includes('CST divergente') || r.motivo.includes('Variação')));
                    if (ap) ap.correcaoAplicada = { campo: 'CST ICMS', valorAntes: valorAntesCst, valorDepois: cstCorrigido };
                }
            }

            // Recalcular Valor ICMS se temos base e alíquota correta
            if (aliquotaFinal !== null && campoVlIcms) {
                const baseFinal = row['ICMS Base item'];
                const vlIcmsCorreto = Number((baseFinal * aliquotaFinal).toFixed(2));
                const vlIcmsAtual = parseBRLNumber(row[campoVlIcms]);
                if (Math.abs(vlIcmsCorreto - vlIcmsAtual) > 0.05) {
                    row[campoVlIcms] = vlIcmsCorreto;
                    if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
                    modifiedCells.get(index).add(campoVlIcms);
                }
            }
        }
    });

    return {
        report,
        correctedData,
        modifiedCells,
        ncmSemCobertura: [...ncmSemCobertura.values()],
    };
};
