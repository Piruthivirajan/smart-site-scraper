const sql = require('mssql');

const config = {
    user: 'JGDClinic',
    password: 'BetJgd@2202',
    server: '216.48.178.173', 
    database: 'JGDMainDev',
    port:1433
};

async function getRecords() {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT row(1) FROM mMedicine`;
        console.log(result.recordset);
    } catch (err) {
        console.error(err);
    }
}

getRecords();
