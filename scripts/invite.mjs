import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { database } from '../server/db.js';

const [role = 'staff', email, file] = process.argv.slice(2);
if (!['staff', 'dealer'].includes(role) || (email && email !== '-' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
  throw new Error('Use: npm run invite -- staff|dealer [email or -] [private file]');
}
const invite = randomBytes(24).toString('base64url');
const hash = createHash('sha256').update(invite).digest('hex');
const sql = database();
await sql`INSERT INTO invites (hash, role, email) VALUES (${hash}, ${role}, ${email && email !== '-' ? email.toLowerCase() : null})`;
if (file) {
  await mkdir(new URL('../.local/', import.meta.url), { recursive: true });
  await writeFile(file, invite + '\n', { flag: 'wx' });
  console.log('Single-use invitation saved to the private file.');
} else {
  console.log(invite);
}
