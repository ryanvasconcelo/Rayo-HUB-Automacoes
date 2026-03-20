const fs = require('fs');
const p = '/Users/ryanrichard/projecont/Rayo/apps/rayo/src/pages/EstoqueAuditorPage.jsx';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
    /export default function EstoqueAuditorPage\(\) \{\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*/s,
    `export default function EstoqueAuditorPage() {
    const { theme, toggle } = useTheme();
    const { resultado, processing, erro, processarParaTeste, limpar } = useEstoqueAuditor();

    const [arquivoEstoque, setArquivoEstoque] = useState(null);
    const [arquivoRazao, setArquivoRazao] = useState(null);

    const [mesSelecionado, setMesSelecionado] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [buscaGlobal, setBuscaGlobal] = useState('');`
);

content = content.replace(
    /\{\/\* ── Tela de Resultado ── \*\/\}\n\s*\{resultado && \(\(\) => \{\n\s*const \[buscaGlobal, setBuscaGlobal\] = useState\(''\);\n\s*return \(\n\s*<div/s,
    `{/* ── Tela de Resultado ── */}
                {resultado && (
                        <div`
);

content = content.replace(
    /\}\)\}\n\s*<\/main>/s,
    `)}\n            </main>`
);

fs.writeFileSync(p, content);
