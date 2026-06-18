import 'dotenv/config';
import mysql from 'mysql2/promise';
const url = process.env.DATABASE_URL;
if(!url){console.log('NO_DATABASE_URL');process.exit(0);}
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute(
  "SELECT supplierId, fields FROM supplier_notes WHERE scope='tapete' AND supplierId='JIANGSU DEZHU CHINA' LIMIT 1"
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
