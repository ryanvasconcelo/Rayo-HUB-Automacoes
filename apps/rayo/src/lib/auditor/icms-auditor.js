/**
 * RAYO HUB — Motor de Auditoria ICMS v3
 *
 * v3 — Novo nesta versão:
 *   - e-Auditoria é OPCIONAL (fonte secundária). Bases legais locais são primárias.
 *   - Correção bug crítico: alíquotas interestaduais corrigidas (Res. 22/89)
 *   - Detecção de importado via dígito de origem CST (Res. 13/2012 → 4%)
 *   - R02: Validação CFOP × ST (NCM na 6108 → CFOP deve ser família 14xx/24xx)
 *   - R03: Validação CST × ST (NCM na 6108 → CST deve ser 060, base/ICMS = 0)
 *   - R07: Cesta básica (Decreto 6.215/23) → CST deve ser 040/041
 *   - baseLegalRef + baseLegalDesc em todos os erros e alertas
 *   - Campo 'fonte' no resultado: 'base_legal_local' | 'e-auditoria' | 'pendente_desambiguacao'
 *
 * GUARDRAIL SOP-IA: Arquivo CORE puro — sem imports de UI/React.
 */

import {
    CFOP_EXCECAO_AMARELA,
    CFOP_DEVOLUCAO,
    CFOP_OPERACOES_ESPECIAIS,
    CFOP_EXCECOES_CREDITO,
    CFOP_FAMILIA_ST,
    resolverAliquota,
    NCM_ST_LEI_6108_22,
    NCM_CESTA_BASICA_PREFIXOS,
    ALIQUOTA_ESPECIFICA_AM,
    BASE_LEGAL_DESCRICOES,
} from './knowledge-base.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizarDescricao = (desc) =>
    String(desc || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

const parseBRLNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).replace(/[R$\s]/gi, '');
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

/**
 * Helper para acessar texto de base legal com fallback seguro.
 */
const getBaseLegal = (chave) => {
    const item = BASE_LEGAL_DESCRICOES[chave];
    return item ?? { ref: chave, desc: '', url: '' };
};

/**
 * Análise Combinatória de CST — ignora o 1º dígito (Origem).
 */
const compararCstCombinatorio = (natureza, cstOriginal, cstBase) => {
    const raizOriginal = String(cstOriginal).padStart(3, '0').slice(-2);
    const raizBase = String(cstBase).padStart(3, '0').slice(-2);

    if (raizOriginal === raizBase) return { status: 'ok' };

    const grupoTributadoComercio = ['00', '20'];
    const grupoTributadoIndustria = ['00', '10', '20', '30', '70'];
    const grupoIsentos = ['40', '41', '50', '90'];
    const grupoSTeMonofasico = ['60', '61'];
    const grupoValido = (natureza === 'industria') ? grupoTributadoIndustria : grupoTributadoComercio;

    if (grupoIsentos.includes(raizOriginal) && grupoIsentos.includes(raizBase)) {
        return { status: 'alerta', detalhe: `Variação Combinatória: esperava raiz ${raizBase}, recebida ${raizOriginal}. Ambas pertencem à mesma tribo de Isentos/Não Tributados.` };
    }
    if (grupoSTeMonofasico.includes(raizOriginal) && grupoSTeMonofasico.includes(raizBase)) {
        return { status: 'alerta', detalhe: `Variação Combinatória: esperava raiz ${raizBase}, recebida ${raizOriginal}. Ambas são de imposto cobrado/retido anteriormente.` };
    }
    if (grupoValido.includes(raizOriginal) && grupoValido.includes(raizBase)) {
        return { status: 'alerta', detalhe: `Variação Combinatória: esperava raiz ${raizBase}, recebida ${raizOriginal}. Ambas são do grupo Tributado (${natureza}).` };
    }

    return { status: 'erro', detalhe: `Divergência Crítica: regra exige equivalência à raiz CST ${raizBase}, mas foi recebida ${raizOriginal}.` };
};

/**
 * Recalcula a Base de Cálculo do ICMS.
 */
export const calcularBaseCerta = (linha, regra, cstRaizEsperado) => {
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

// ─── Índice do e-Auditoria ────────────────────────────────────────────────────
const construirBaseMap = (eAuditoriaRows) => {
    const map = new Map();
    if (!eAuditoriaRows || eAuditoriaRows.length === 0) return map;

    eAuditoriaRows.forEach(row => {
        const ncm = String(row['NCM'] || '').replace(/\D/g, '');
        if (!ncm) return;

        const pushToMap = (key, item) => {
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        };

        pushToMap(ncm, row);

        const desc = normalizarDescricao(row['Descrição do Produto'] || row['Descrição'] || '');
        if (desc) pushToMap(`${ncm}|${desc}`, row);

        if (ncm.length >= 6) pushToMap(ncm.slice(0, 6), row);
        if (ncm.length >= 4) pushToMap(ncm.slice(0, 4), row);
    });

    return map;
};

const resolverDesambiguacaoST = (regrasArray, ncmBruto, cstOriginalLivrao) => {
    if (!regrasArray || regrasArray.length === 0) return null;
    if (regrasArray.length === 1) return regrasArray[0];

    const ncmLimpo = String(ncmBruto || '').replace(/\D/g, '');
    const raizLivrao = String(cstOriginalLivrao || '').padStart(3, '0').slice(-2);
    const isStOficial = NCM_ST_LEI_6108_22.has(ncmLimpo) || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 6)) || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 4));

    const grupos = isStOficial
        ? regrasArray.filter(r => ['10','30','60','70','90'].includes(String(r['CST/CSOSN'] || '').padStart(3, '0').slice(-2)))
        : regrasArray.filter(r => ['00','20','40','50','51'].includes(String(r['CST/CSOSN'] || '').padStart(3, '0').slice(-2)));

    if (grupos.length > 0) {
        const matchCli = grupos.find(r => String(r['CST/CSOSN']).padStart(3, '0').slice(-2) === raizLivrao);
        return matchCli || grupos[0];
    }

    const fallCli = regrasArray.find(r => String(r['CST/CSOSN']).padStart(3, '0').slice(-2) === raizLivrao);
    return fallCli || regrasArray[0];
};

/**
 * Tenta resolver uma regra a partir das bases legais locais (sem e-Auditoria).
 * Retorna um objeto sintético de regra ou null se não houver cobertura local.
 */
const buscarRegraLocal = (ncmLimpo) => {
    const isStOficial = NCM_ST_LEI_6108_22.has(ncmLimpo)
        || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 6))
        || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 4));

    if (isStOficial) {
        return { _fonte: 'base_legal_local', 'CST/CSOSN': '060', _isST: true };
    }

    const isCestaBasica = NCM_CESTA_BASICA_PREFIXOS.has(ncmLimpo.slice(0, 4));
    if (isCestaBasica) {
        return { _fonte: 'base_legal_local', 'CST/CSOSN': '040', _isCestaBasica: true };
    }

    return null;
};

const buscarRegra = (baseMap, ncmLimpo, descricaoLivrao, ncmBruto, cstOriginal) => {
    // 1ª — lookup local (bases legais próprias)
    const regraLocal = buscarRegraLocal(ncmLimpo);
    if (regraLocal) return regraLocal;

    // 2ª — e-Auditoria (somente se disponível)
    if (baseMap.size === 0) return null;

    const descNorm = normalizarDescricao(descricaoLivrao);
    if (descNorm && baseMap.has(`${ncmLimpo}|${descNorm}`)) return baseMap.get(`${ncmLimpo}|${descNorm}`)[0];
    if (baseMap.has(ncmLimpo)) return resolverDesambiguacaoST(baseMap.get(ncmLimpo), ncmBruto, cstOriginal);
    const p6 = ncmLimpo.slice(0, 6);
    if (baseMap.has(p6)) return resolverDesambiguacaoST(baseMap.get(p6), ncmBruto, cstOriginal);
    const p4 = ncmLimpo.slice(0, 4);
    if (baseMap.has(p4)) return resolverDesambiguacaoST(baseMap.get(p4), ncmBruto, cstOriginal);

    return null;
};

// Retorna array de regras candidatas (para desambiguação interativa)
const buscarRegrasCandidatas = (baseMap, ncmLimpo, ncmBruto) => {
    if (baseMap.has(ncmLimpo)) return baseMap.get(ncmLimpo);
    const p6 = ncmLimpo.slice(0, 6);
    if (baseMap.has(p6)) return baseMap.get(p6);
    const p4 = ncmLimpo.slice(0, 4);
    if (baseMap.has(p4)) return baseMap.get(p4);
    return [];
};

// ─── Motor Principal ──────────────────────────────────────────────────────────

/**
 * @param {Array}  alterdataRows   - Linhas do Livrão Bruto
 * @param {Array|null}  eAuditoriaRows  - Regras do e-Auditoria (OPCIONAL — pode ser null/[])
 * @param {Object} perfil          - { natureza: 'comercio'|'industria', regime: string }
 * @returns {{ report, correctedData, modifiedCells, ncmSemCobertura, pendingDisambiguation }}
 */
export const runAudit = (alterdataRows, eAuditoriaRows, perfil) => {
    const report = [];
    const ncmSemCobertura = new Map();
    const pendingDisambiguation = []; // Épico 4 — NCMs com múltiplas regras ambíguas
    const correctedData = JSON.parse(JSON.stringify(alterdataRows));
    const modifiedCells = new Map();

    // e-Auditoria é OPCIONAL — se ausente, baseMap fica vazio e usamos apenas bases locais
    const baseMap = construirBaseMap(eAuditoriaRows || []);
    const eAuditoriaDisponivel = baseMap.size > 0;

    correctedData.forEach((row, index) => {
        const numLinha = index + 2;

        const ncmBruto = row['Classificação'];
        if (!ncmBruto) return;

        const ncmLimpo = String(ncmBruto).replace(/\D/g, '');
        const cstOriginal = String(row['CST ICMS'] || '').padStart(3, '0');
        const cfopOriginal = String(row['CFOP'] || '').replace(/\D/g, '');
        const raizInformada = cstOriginal.slice(-2);
        const digitoOrigemCST = cstOriginal.charAt(0); // 0=nacional, 1-8=importado
        const descricaoLivrao = row['Descrição'] || row['Nome do Produto'] || '';
        const ufOrigem = row['UF Emitente'] || row['UF Origem'] || row['Estado Emitente'] || '';

        const isOperacaoEspecial = CFOP_OPERACOES_ESPECIAIS.has(cfopOriginal) && !CFOP_EXCECOES_CREDITO.has(cfopOriginal);
        const isExcecaoAmarela = CFOP_EXCECAO_AMARELA.has(cfopOriginal);
        const isDevolucao = CFOP_DEVOLUCAO.has(cfopOriginal);

        // ─── Verificação de ST logo no início ─────────────────────────────
        const ncmNaST = NCM_ST_LEI_6108_22.has(ncmLimpo)
            || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 6))
            || NCM_ST_LEI_6108_22.has(ncmLimpo.slice(0, 4));

        const ncmCestaBasica = NCM_CESTA_BASICA_PREFIXOS.has(ncmLimpo.slice(0, 4));

        // ════════════════════════════════════════════════════════════════════
        // OPERAÇÃO ESPECIAL — CST 90, zerar base/alíquota/ICMS
        // ════════════════════════════════════════════════════════════════════
        if (isOperacaoEspecial) {
            const digitoOrigem = cstOriginal.charAt(0) || '0';
            const cstNovo = digitoOrigem + '90';
            const bcOriginal = row['ICMS Base item'];
            const campoAliq = Object.keys(row).find(k => ['Alíquota ICMS','Aliquota ICMS','ICMS Aliquota','% ICMS NF'].includes(k));
            const campoVl = Object.keys(row).find(k => ['Valor ICMS','ICMS Valor','VL_ICMS','ICMS Valor item'].includes(k));
            const bl = getBaseLegal('OPERACAO_ESPECIAL_CST90');

            row['CST Antigo'] = cstOriginal;
            row['CST ICMS'] = cstNovo;
            row['ICMS Base item'] = 0;
            if (campoAliq) row[campoAliq] = 0;
            if (campoVl) row[campoVl] = 0;

            if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
            ['CST ICMS', 'ICMS Base item'].forEach(f => modifiedCells.get(index).add(f));

            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: isExcecaoAmarela ? 'alerta' : 'info',
                motivo: 'Operação Especial — CST 90 Aplicado',
                detalhe: `CFOP ${cfopOriginal} = operação não relacionada à aquisição para venda. CST alterado ${cstOriginal} → ${cstNovo}. Base, alíquota e ICMS zerados.`,
                baseLegalRef: 'OPERACAO_ESPECIAL_CST90',
                baseLegalDesc: bl.desc,
                baseLegalNome: bl.ref,
                correcaoAplicada: { campo: 'CST ICMS / Base / Alíquota / Valor ICMS', valorAntes: `CST: ${cstOriginal} | Base: ${bcOriginal}`, valorDepois: `CST: ${cstNovo} | Base: 0` },
                fonte: 'base_legal_local',
            });
            return;
        }

        // ════════════════════════════════════════════════════════════════════
        // R02 — CFOP × ST (Documento Técnico Projecont v1.0, Regra R02)
        // NCM na Lista 6108 → CFOP deve ser da família 14xx/24xx
        // ════════════════════════════════════════════════════════════════════
        if (ncmNaST && !CFOP_FAMILIA_ST.has(cfopOriginal) && !CFOP_OPERACOES_ESPECIAIS.has(cfopOriginal) && !isDevolucao) {
            const bl = getBaseLegal('CFOP_INCORRETO_ST');
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'CFOP Incorreto para Item ST — R02',
                detalhe: `NCM ${ncmBruto} pertence ao Decreto 6.108 (ST). CFOP ${cfopOriginal} está incorreto para este regime. CFOPs válidos para compra ST: 1403 (estadual) ou 2403 (interestadual). Verifique o lançamento.`,
                baseLegalRef: 'CFOP_INCORRETO_ST',
                baseLegalDesc: bl.desc,
                baseLegalNome: bl.ref,
                creditoVedadoST: true,
                correcaoAplicada: null,
                fonte: 'base_legal_local',
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // R03 — CST × ST (Documento Técnico Projecont v1.0, Regra R03)
        // NCM na Lista 6108 → CST deve ser 060, base e ICMS = 0
        // ════════════════════════════════════════════════════════════════════
        if (ncmNaST && raizInformada !== '60' && raizInformada !== '61') {
            const bcInformada = parseBRLNumber(row['ICMS Base item']);
            const blSt = getBaseLegal('NCM_ST_6108');
            const blCst = getBaseLegal('CST_INCORRETO_ST');

            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'CST Incorreto para Item ST — R03',
                detalhe: `NCM ${ncmBruto} pertence ao Decreto 6.108 (ST). CST correto: 060 (ICMS cobrado anteriormente por ST). Informado: ${cstOriginal}. Base de cálculo e valor ICMS devem ser zerados.`,
                baseLegalRef: 'CST_INCORRETO_ST',
                baseLegalDesc: blCst.desc,
                baseLegalNome: blCst.ref,
                creditoVedadoST: true,
                correcaoAplicada: null,
                fonte: 'base_legal_local',
            });

            // Auto-correção: zerar base e ICMS para itens ST com base > 0
            if (bcInformada > 0) {
                const campoAliq = Object.keys(row).find(k => ['Alíquota ICMS','Aliquota ICMS','ICMS Aliquota','% ICMS NF'].includes(k));
                const campoVl = Object.keys(row).find(k => ['Valor ICMS','ICMS Valor','VL_ICMS','ICMS Valor item'].includes(k));

                row['CST Antigo'] = cstOriginal;
                const digitoOrigem = cstOriginal.charAt(0) || '0';
                row['CST ICMS'] = digitoOrigem + '60';
                row['ICMS Base item'] = 0;
                if (campoAliq) row[campoAliq] = 0;
                if (campoVl) row[campoVl] = 0;

                if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
                ['CST ICMS', 'ICMS Base item'].forEach(f => modifiedCells.get(index).add(f));

                const ap = report[report.length - 1];
                if (ap) ap.correcaoAplicada = {
                    campo: 'CST ICMS / ICMS Base item / Valor ICMS',
                    valorAntes: `CST: ${cstOriginal} | Base: R$ ${bcInformada.toFixed(2)}`,
                    valorDepois: `CST: ${digitoOrigem}60 | Base: 0 | ICMS: 0`,
                };
            }

            return; // linha processada como ST — não auditar CST/alíquota normal
        }

        // ════════════════════════════════════════════════════════════════════
        // Busca regra (local → e-Auditoria)
        // ════════════════════════════════════════════════════════════════════
        const regra = buscarRegra(baseMap, ncmLimpo, descricaoLivrao, ncmBruto, cstOriginal);
        const fonteRegra = regra?._fonte === 'base_legal_local' ? 'base_legal_local' : (eAuditoriaDisponivel ? 'e-auditoria' : 'sem_cobertura');

        // ════════════════════════════════════════════════════════════════════
        // Sem cobertura
        // ════════════════════════════════════════════════════════════════════
        if (!regra) {
            // Verificar se há múltiplas candidatas para desambiguação
            const candidatas = eAuditoriaDisponivel ? buscarRegrasCandidatas(baseMap, ncmLimpo, ncmBruto) : [];
            if (candidatas.length > 1) {
                pendingDisambiguation.push({ rowIndex: index, ncm: ncmBruto, descricaoLivrao, opcoes: candidatas });
                return; // aguarda escolha humana
            }

            if (!ncmSemCobertura.has(ncmBruto)) {
                ncmSemCobertura.set(ncmBruto, { ncm: ncmBruto, linhas: [], descricao: descricaoLivrao });
            }
            ncmSemCobertura.get(ncmBruto).linhas.push(numLinha);

            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'NCM não auditado — Análise Manual Obrigatória',
                detalhe: 'Este NCM não consta nas bases legais locais nem no e-Auditoria. Auditoria manual obrigatória.',
                baseLegalRef: null, baseLegalDesc: null, baseLegalNome: null,
                correcaoAplicada: null,
                fonte: 'sem_cobertura',
            });
            return;
        }

        const cstBase = String(regra['CST/CSOSN'] || '').padStart(3, '0');
        const raizEsperada = cstBase.slice(-2);

        row['CST Antigo'] = cstOriginal;
        row['Desc_eAuditoria'] = regra['DESCRIÇÃO'] || regra['Descrição do Produto'] || regra['Descrição'] || regra['DESCRICAO'] || '';

        // ════════════════════════════════════════════════════════════════════
        // R07 — Cesta Básica (Decreto 6.215/23)
        // ════════════════════════════════════════════════════════════════════
        if (ncmCestaBasica && raizEsperada !== '40' && raizEsperada !== '41') {
            const bl = getBaseLegal('ISENCAO_CESTA_6215');
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                severidade: 'alerta',
                motivo: 'Possível Isenção Cesta Básica (Lei AM 6.215/23) — R07',
                detalhe: `NCM ${ncmBruto} pode ser produto da cesta básica com isenção de ICMS no AM (Lei 6.215/23). CST esperado: 040 ou 041. Confirme antes de tributar.`,
                baseLegalRef: 'ISENCAO_CESTA_6215',
                baseLegalDesc: bl.desc,
                baseLegalNome: bl.ref,
                correcaoAplicada: null,
                fonte: fonteRegra,
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 1 — Matemática da Base de Cálculo
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
                baseLegalRef: null, baseLegalDesc: null, baseLegalNome: null,
                correcaoAplicada: null,
                fonte: fonteRegra,
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 1b — Alíquota e Valor ICMS (R06 corrigido)
        // ════════════════════════════════════════════════════════════════════
        const { aliquota: aliquotaCorreta, origem: origemCfop, baseLegalRef: aliqBlRef } = resolverAliquota(cfopOriginal, ufOrigem, digitoOrigemCST);
        const aliqEspecifica = ALIQUOTA_ESPECIFICA_AM[ncmLimpo.slice(0, 4)] ?? null;
        const aliquotaFinal = aliqEspecifica ?? aliquotaCorreta;

        const campoAliquota = Object.keys(row).find(k => ['Alíquota ICMS','Aliquota ICMS','ICMS Aliquota','% ICMS NF'].includes(k));
        const campoVlIcms = Object.keys(row).find(k => ['Valor ICMS','ICMS Valor','VL_ICMS','ICMS Valor item'].includes(k));
        const aliquotaInformada = campoAliquota ? parseBRLNumber(row[campoAliquota]) : null;

        if (aliquotaFinal !== null && aliquotaInformada !== null) {
            const skipAliquotaCheck = raizEsperada === '61' || bcMapeada === 0;
            const aliqInformNorm = aliquotaInformada > 1 ? aliquotaInformada / 100 : aliquotaInformada;

            if (!skipAliquotaCheck && Math.abs(aliqInformNorm - aliquotaFinal) > 0.001) {
                const blAliq = aliqBlRef ? getBaseLegal(aliqBlRef) : { ref: 'Legislação Federal', desc: '', url: '' };
                const aliqNFpct = (aliqInformNorm * 100).toFixed(0);
                const aliqCorretaPct = (aliquotaFinal * 100).toFixed(0);
                const bcParaCalc = parseBRLNumber(row['ICMS Base item']);
                const delta = Math.abs((aliquotaFinal - aliqInformNorm) * bcParaCalc);

                report.push({
                    linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                    aliquotaNF: aliqInformNorm,
                    aliquotaCorreta: aliquotaFinal,
                    aliquotaAplicada: aliquotaFinal,
                    icmsEsperado: bcParaCalc * aliquotaFinal,
                    diferencaAliquota: delta,
                    severidade: 'erro',
                    motivo: 'Alíquota ICMS Divergente — R06',
                    detalhe: `Origem: ${origemCfop}${aliqEspecifica ? ' (alíquota específica AM)' : ''}. Alíq. NF: ${aliqNFpct}% | Alíq. Correta: ${aliqCorretaPct}% — ${blAliq.ref}. Diferença no crédito: R$ ${delta.toFixed(2)}.`,
                    baseLegalRef: aliqBlRef || null,
                    baseLegalDesc: blAliq.desc,
                    baseLegalNome: blAliq.ref,
                    correcaoAplicada: null,
                    fonte: fonteRegra,
                });
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 2 — ST Invertido
        // ════════════════════════════════════════════════════════════════════
        if (raizInformada === '60' && raizEsperada !== '60') {
            report.push({
                linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                esperado: cstBase, severidade: 'erro',
                motivo: 'ST Indevido — Tributação Irregular',
                detalhe: `CST 0${raizInformada} (ST cobrado anteriormente), mas a regra indica tributação normal (CST ${cstBase}). Crédito pode estar sendo sonegado.`,
                baseLegalRef: null, baseLegalDesc: null, baseLegalNome: null,
                correcaoAplicada: null,
                fonte: fonteRegra,
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
                detalhe: `CFOP ${cfopOriginal} é devolução. Verifique se o ICMS está sendo corretamente creditado.`,
                baseLegalRef: null, baseLegalDesc: null, baseLegalNome: null,
                correcaoAplicada: null,
                fonte: fonteRegra,
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
                    baseLegalRef: null, baseLegalDesc: null, baseLegalNome: null,
                    correcaoAplicada: null,
                    fonte: fonteRegra,
                });
            } else {
                report.push({
                    linha: numLinha, ncm: ncmBruto, cst: cstOriginal, cfop: cfopOriginal,
                    esperado: cstBase, aliquotaAplicada: aliquotaFinal,
                    icmsEsperado: parseBRLNumber(row['ICMS Base item']) * (aliquotaFinal || 0),
                    severidade: resultadoCst.status,
                    motivo: resultadoCst.status === 'erro'
                        ? 'CST divergente da Base Auditada (Erro Crítico)'
                        : 'Variação de CST Tributável (Atenção)',
                    detalhe: `CFOP ${cfopOriginal}: ${resultadoCst.detalhe}`,
                    baseLegalRef: null, baseLegalDesc: null, baseLegalNome: null,
                    correcaoAplicada: null,
                    fonte: fonteRegra,
                });
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // AUTO-CORREÇÃO
        // ════════════════════════════════════════════════════════════════════
        const podeCorrigir = !isExcecaoAmarela && !isDevolucao;

        if (podeCorrigir) {
            if (erroMatematico) {
                const valorAntes = row['ICMS Base item'];
                row['ICMS Base item'] = Number(bcMapeada.toFixed(2));
                if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
                modifiedCells.get(index).add('ICMS Base item');
                const ap = report.findLast(r => r.linha === numLinha && r.motivo.includes('Matemático'));
                if (ap) ap.correcaoAplicada = { campo: 'ICMS Base item', valorAntes, valorDepois: row['ICMS Base item'] };
            }

            if (resultadoCst.status === 'erro') {
                const digitoOrigem = cstOriginal.charAt(0) || '0';
                const cstCorrigido = digitoOrigem + raizEsperada;
                const valorAntesCst = row['CST ICMS'];
                row['CST ICMS'] = cstCorrigido;
                if (!modifiedCells.has(index)) modifiedCells.set(index, new Set());
                modifiedCells.get(index).add('CST ICMS');
                const ap = report.findLast(r => r.linha === numLinha && r.motivo.includes('CST divergente'));
                if (ap) ap.correcaoAplicada = { campo: 'CST ICMS', valorAntes: valorAntesCst, valorDepois: cstCorrigido };
            }

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
        pendingDisambiguation,
    };
};
