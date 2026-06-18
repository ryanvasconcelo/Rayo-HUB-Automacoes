import { fetchFortesDataMock } from './src/lib/folha-dealer/fortes-data-fetcher.js';

async function run() {
  const { rawRows } = await fetchFortesDataMock('9274', '202604');
  
  const eventos = ['937', '938', '605'];
  const diag = {};

  rawRows.filter(r => eventos.includes(r.evento)).forEach(r => {
    if (!diag[r.evento]) diag[r.evento] = { count: 0, total: 0, names: new Set(), provs: new Set(), tipos: new Set() };
    diag[r.evento].count++;
    diag[r.evento].total += parseFloat(r.valor);
    diag[r.evento].names.add(r.nomeEvento);
    diag[r.evento].provs.add(r.provDesc);
    diag[r.evento].tipos.add(r.tipoRegistro);
  });

  for (const k in diag) {
    diag[k].names = Array.from(diag[k].names);
    diag[k].provs = Array.from(diag[k].provs);
    diag[k].tipos = Array.from(diag[k].tipos);
  }

  console.log(JSON.stringify(diag, null, 2));
}

run().catch(console.error);
