import mssql from 'mssql';
const config = {
    user: 'biprojecont',
    password: 'proj@#2087!',
    server: '192.168.0.5',
    port: 1433,
    database: 'AC',
    options: { encrypt: false, trustServerCertificate: true }
};

async function test() {
    let pool;
    try {
        pool = await mssql.connect(config);
        
        console.log('--- COLUMNS IN EPG ---');
        const epgColumns = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('EPG')");
        const cols = epgColumns.recordset.map(c => c.name);
        console.log(cols.join(', '));
        
    } catch (e) {
        console.error(e);
    } finally {
        if (pool) pool.close();
    }
}
test();
