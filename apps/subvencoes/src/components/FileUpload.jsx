import { useRef, useState, useCallback, useEffect } from 'react';

export function FileUpload({ spedFilesRef, xmlFilesRef, autoLoadXmls }) {
    const [spedNames, setSpedNames] = useState([]);
    const [xmlNames, setXmlNames] = useState([]);
    const spedInput = useRef(null);
    const xmlInput = useRef(null);

    useEffect(() => {
        if (autoLoadXmls && autoLoadXmls.length > 0) {
            xmlFilesRef.current = autoLoadXmls;
            setXmlNames(autoLoadXmls.map(f => f.name));
        }
    }, [autoLoadXmls, xmlFilesRef]);

    const onSpedDrop = useCallback((e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || e.target.files || [])
            .filter((f) => f.name.toLowerCase().endsWith('.txt'));
        if (!files.length) return;
        spedFilesRef.current = files;
        setSpedNames(files.map((f) => f.name));
    }, [spedFilesRef]);

    const onXmlDrop = useCallback((e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || e.target.files || []);
        if (!files.length) return;
        xmlFilesRef.current = files;
        setXmlNames(files.map((f) => f.name));
    }, [xmlFilesRef]);

    const preventDef = (e) => { e.preventDefault(); e.stopPropagation(); };

    return (
        <div className="card">
            <div className="card-title">1. Carregue os Arquivos</div>
            <div className="upload-grid">
                {/* SPEDs — aceita múltiplos (matriz + filiais) */}
                <div
                    className="dropzone"
                    onClick={() => spedInput.current?.click()}
                    onDrop={onSpedDrop}
                    onDragOver={preventDef}
                    onDragEnter={preventDef}
                >
                    <div className="dropzone-icon">📄</div>
                    <div className="dropzone-title">SPED EFD ICMS/IPI</div>
                    <div className="dropzone-sub">
                        Um ou mais arquivos .txt — Selecione matriz e filiais juntos
                    </div>
                    {spedNames.length > 0 ? (
                        <div className="dropzone-file">
                            ✓ {spedNames.length} SPED(s): {spedNames.slice(0, 2).join(', ')}
                            {spedNames.length > 2 ? ` +${spedNames.length - 2} mais` : ''}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Ctrl+Click para selecionar vários arquivos
                        </div>
                    )}
                    <input
                        ref={spedInput}
                        type="file"
                        accept=".txt"
                        multiple
                        style={{ display: 'none' }}
                        onChange={onSpedDrop}
                    />
                </div>

                {/* XMLs */}
                <div
                    className="dropzone"
                    onClick={() => xmlInput.current?.click()}
                    onDrop={onXmlDrop}
                    onDragOver={preventDef}
                    onDragEnter={preventDef}
                >
                    <div className="dropzone-icon">🗄️</div>
                    <div className="dropzone-title">NF-e XMLs</div>
                    <div className="dropzone-sub">Arquivo(s) .xml ou .zip — NF-e modelo 55</div>
                    {xmlNames.length > 0 && (
                        <div className="dropzone-file">
                            ✓ {xmlNames.length} arquivo(s): {xmlNames.slice(0, 2).join(', ')}
                            {xmlNames.length > 2 ? ` +${xmlNames.length - 2}` : ''}
                        </div>
                    )}
                    <input
                        ref={xmlInput}
                        type="file"
                        accept=".xml,.zip"
                        multiple
                        style={{ display: 'none' }}
                        onChange={onXmlDrop}
                    />
                </div>
            </div>
        </div>
    );
}
