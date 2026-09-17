# Encargos eSocial sem empregado na folha
> Fallback de bases oficiais do Fortes que não casam com a folha mensal

Entry: `apps/rayo-server/fortes-extractor.js:ENCARGO_BASE_QUERY`
Flow: bases eSocial → `extractFortesPayroll()` → `/api/fortes/extract` → `useFolhaDealer()` → `normalizeFortesQueryRows()` → motor Dealer.

Join: `bases` usa `LEFT JOIN empLot`; matrícula sem folha retorna `mappingStatus: 'unmapped'` e `esMat`.

Fallback: `encargo-calculator.js:calculateEncargosFromBases()` preserva BC CPP/FGTS do Fortes, marca origem `fortes-encargo-unmapped`; lotação vazia resolve pelo mapping `''` em `braga-veiculos.config.js`.

Alerta: `index.js:buildSourceIssues()` emite `UNMAPPED_ESOCIAL_ENCARGO`; `useFolhaDealer.js:describeEncargoCoverage()` mostra o aviso e totais no topo.

Updated: 2026-09-17
