import { readFile } from 'node:fs/promises';
import { database } from '../server/db.js';

const sql = database();
const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
await sql.transaction(schema.split(';').map(statement => statement.trim()).filter(Boolean).map(statement => sql.query(statement)));
console.log('Database schema is ready.');
