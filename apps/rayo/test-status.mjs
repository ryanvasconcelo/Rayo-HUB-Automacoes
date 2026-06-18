import { runFolhaDealerEngine, bragaVeiculosConfig, buildBragaRows } from './src/lib/folha-dealer/index.js';

const result = runFolhaDealerEngine({
    config: bragaVeiculosConfig,
    sourceRows: buildBragaRows(),
    competence: '2026-04'
});

console.log(JSON.stringify(result.issues, null, 2));
