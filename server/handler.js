import { createHash, randomBytes, randomUUID, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { database } from './db.js';
import { estimate, pinValid, quantityValid, transitions } from '../shared/commerce.js';

const catalog = JSON.parse(readFileSync(new URL('../shared/catalog.json', import.meta.url), 'utf8'));
const products = new Map(catalog.map(product => [product.id, product]));
const scrypt = promisify(derive);
const hash = value => createHash('sha256').update(value).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validToken = token => /^[\w-]{32,64}$/.test(token || '');
const cookieName = 'vardhman_session';
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const seconds = 60 * 60 * 24 * 7;
const publicAccount = ({ id, email, name, company, role }) => ({ id, email, name, company, role });

function reject(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}

function sessionToken(req) {
  return (req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}

function sessionCookie(res, token, age = seconds) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', cookieName + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + age + secure);
}

async function openSession(sql, account, res) {
  const token = randomBytes(32).toString('base64url');
  await sql`INSERT INTO sessions (hash, account_id, expires_at) VALUES (${hash(token)}, ${account.id}, now() + interval '7 days')`;
  sessionCookie(res, token);
  return publicAccount(account);
}

async function currentAccount(sql, req) {
  const token = sessionToken(req);
  if (!validToken(token)) return null;
  const [account] = await sql`SELECT a.id, a.email, a.name, a.company, a.role
    FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.hash = ${hash(token)} AND s.expires_at > now()`;
  return account || null;
}

async function rateLimit(sql, key, max) {
  const [limit] = await sql`INSERT INTO rate_limits (key, hits, expires_at) VALUES (${hash(key)}, 1, now() + interval '15 minutes')
    ON CONFLICT (key) DO UPDATE SET hits = CASE WHEN rate_limits.expires_at <= now() THEN 1 ELSE rate_limits.hits + 1 END,
    expires_at = CASE WHEN rate_limits.expires_at <= now() THEN now() + interval '15 minutes' ELSE rate_limits.expires_at END RETURNING hits`;
  if (limit.hits > max) reject('Too many attempts. Try again in 15 minutes.', 429);
}

async function bodyOf(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) reject('JSON is required.', 415);
  if (Number(req.headers['content-length']) > 40000) reject('Request is too large.', 413);
  let parsed = req.body;
  if (parsed === undefined) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 40000) reject('Request is too large.', 413);
    }
    parsed = raw;
  }
  try {
    if (typeof parsed === 'string') parsed = JSON.parse(parsed || '{}');
  } catch {
    reject('Invalid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) reject('Invalid request.');
  return parsed;
}

async function signIn(sql, req, res, body) {
  const email = text(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!emailPattern.test(email) || password.length < 12 || password.length > 128) reject('Enter a valid email and password.');
  const ip = req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress;
  await rateLimit(sql, 'sign-in-ip:' + ip, 35);
  await rateLimit(sql, 'sign-in-email:' + email, 12);
  const [account] = await sql`SELECT id, email, name, company, role, password_hash FROM accounts WHERE email = ${email}`;
  const saved = account?.password_hash || '00000000000000000000000000000000:' + '0'.repeat(128);
  const computed = await passwordHash(password, saved.split(':')[0]);
  if (!timingSafeEqual(Buffer.from(saved), Buffer.from(computed)) || !account) reject('Email or password is incorrect.', 401);
  return openSession(sql, account, res);
}

async function register(sql, req, res, body) {
  const email = text(body.email, 254).toLowerCase();
  const name = text(body.name, 100);
  const company = text(body.company, 120);
  const password = typeof body.password === 'string' ? body.password : '';
  const invite = text(body.invite, 80);
  if (!name || !company || !emailPattern.test(email) || !validToken(invite) || password.length < 12 || password.length > 128) {
    reject('Enter your details, a valid invitation and a password of at least 12 characters.');
  }
  await rateLimit(sql, 'register:' + (req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress), 15);
  const id = randomUUID();
  const secret = await passwordHash(password);
  let account;
  try {
    [account] = await sql`WITH claimed AS (
      DELETE FROM invites WHERE hash = ${hash(invite)} AND expires_at > now() AND (email IS NULL OR email = ${email}) RETURNING role
    )
    INSERT INTO accounts (id, email, name, company, role, password_hash)
    SELECT ${id}, ${email}, ${name}, ${company}, role, ${secret} FROM claimed
    RETURNING id, email, name, company, role`;
  } catch (error) {
    if (error.code === '23505') reject('An account already exists for this email.', 409);
    throw error;
  }
  if (!account) reject('This invitation is invalid, expired or already used.');
  return openSession(sql, account, res);
}

function orderPayload(body) {
  const pin = text(body.pin, 20);
  const city = text(body.city, 100);
  const service = body.service === 'Priority' ? 'Priority' : 'Standard';
  if (!pinValid(pin) || !city) reject('Enter the destination city and a valid six-digit PIN code.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 25) reject('Add between 1 and 25 article lines.');
  const items = body.items.map(item => {
    const product = products.get(String(item?.product));
    const quantity = Number(item?.quantity);
    const article = text(item?.article, 80);
    const shade = text(item?.shade, 80);
    if (!product || !article || !shade || !quantityValid(quantity) || !['Cones', 'Tubes', 'Boxes', 'Spools'].includes(item?.unit)) {
      reject('Each line needs a product, article or size, shade, unit and a valid quantity.');
    }
    return { product: product.id, name: product.name, article, shade, unit: item.unit, quantity, customShade: item.customShade === true };
  });
  return { items, pin, city, service, notes: text(body.notes, 1000), estimate: estimate(pin, items, service) };
}

async function createRequest(sql, account, body) {
  if (account.role !== 'dealer') reject('A dealer account is required to submit a request.', 403);
  const payload = orderPayload(body);
  if (!/^[\da-f-]{36}$/i.test(body.key || '')) reject('A request reference is required.');
  const id = 'VY-' + hash(account.id + ':' + body.key).slice(0, 12).toUpperCase();
  const history = JSON.stringify([{ status: 'Submitted', at: new Date().toISOString() }]);
  await sql`INSERT INTO requests (id, dealer_id, payload, history)
    VALUES (${id}, ${account.id}, ${JSON.stringify(payload)}::jsonb, ${history}::jsonb) ON CONFLICT (id) DO NOTHING`;
  const [row] = await sql`SELECT * FROM requests WHERE id = ${id} AND dealer_id = ${account.id}`;
  return row;
}

async function listRequests(sql, account) {
  if (account.role === 'staff') {
    return sql`SELECT r.*, a.company, a.name AS dealer_name FROM requests r JOIN accounts a ON a.id = r.dealer_id ORDER BY r.created_at DESC`;
  }
  return sql`SELECT * FROM requests WHERE dealer_id = ${account.id} ORDER BY created_at DESC`;
}

async function changeRequest(sql, account, body) {
  const id = text(body.id, 30);
  const [current] = await sql`SELECT * FROM requests WHERE id = ${id}`;
  if (!current || (account.role !== 'staff' && current.dealer_id !== account.id)) reject('Request was not found.', 404);
  const next = body.status;
  if (!transitions[current.status]?.includes(next) ||
      (account.role === 'dealer' ? !['Confirmed', 'Declined'].includes(next) : next === 'Confirmed')) {
    reject('That status change is unavailable.', 409);
  }
  let quote = current.quote;
  if (next === 'Quoted') {
    const amounts = [body.subtotal, body.freight, body.tax].map(value => value === '' || value == null ? NaN : Number(value));
    if (amounts.some(n => !Number.isFinite(n) || n < 0 || n > 1e9) || amounts[0] <= 0) reject('Enter valid quote amounts.');
    const [subtotal, freight, tax] = amounts.map(n => Math.round(n * 100) / 100);
    const days = Number(body.days);
    if (!Number.isInteger(days) || days < 1 || days > 120) reject('Enter a lead time from 1 to 120 business days.');
    quote = { subtotal, freight, tax, total: Math.round((subtotal + freight + tax) * 100) / 100, days, note: text(body.note, 1000) };
  }
  const tracking = next === 'Dispatched' ? text(body.tracking, 120) : current.tracking;
  if (next === 'Dispatched' && !tracking) reject('Enter the carrier and tracking reference.');
  const event = JSON.stringify([{ status: next, at: new Date().toISOString() }]);
  const [updated] = await sql`UPDATE requests SET status = ${next}, quote = ${JSON.stringify(quote)}::jsonb,
    tracking = ${tracking}, updated_at = now(), history = history || ${event}::jsonb
    WHERE id = ${id} AND status = ${current.status} RETURNING *`;
  if (!updated) reject('The request changed. Refresh and try again.', 409);
  return updated;
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  try {
    const action = new URL(req.url, 'http://localhost').searchParams.get('action');
    if (!['GET', 'POST'].includes(req.method)) reject('Method unavailable.', 405);
    if (req.method === 'POST' && (req.headers['sec-fetch-site'] === 'cross-site' ||
      (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host))) reject('Request origin is invalid.', 403);
    const sql = database();
    if (req.method === 'GET') {
      const account = await currentAccount(sql, req);
      if (action === 'session') return send(res, 200, { account });
      if (!account) reject('Sign in to continue.', 401);
      if (action === 'requests') return send(res, 200, { requests: await listRequests(sql, account) });
      reject('Endpoint unavailable.', 404);
    }
    const body = await bodyOf(req);
    if (action === 'login' || action === 'register') {
      const account = action === 'login' ? await signIn(sql, req, res, body) : await register(sql, req, res, body);
      return send(res, 200, { account });
    }
    if (action === 'logout') {
      const token = sessionToken(req);
      if (validToken(token)) await sql`DELETE FROM sessions WHERE hash = ${hash(token)}`;
      sessionCookie(res, '', 0);
      return send(res, 200, {});
    }
    const account = await currentAccount(sql, req);
    if (!account) reject('Sign in to continue.', 401);
    if (action === 'submit') {
      await rateLimit(sql, 'submit:' + account.id, 40);
      return send(res, 200, { request: await createRequest(sql, account, body) });
    }
    if (action === 'status') return send(res, 200, { request: await changeRequest(sql, account, body) });
    if (action === 'invite') {
      if (account.role !== 'staff') reject('A staff account is required.', 403);
      const email = text(body.email, 254).toLowerCase();
      if (!emailPattern.test(email)) reject('Enter the dealer’s email address.');
      await rateLimit(sql, 'invite:' + account.id, 20);
      const invite = randomBytes(24).toString('base64url');
      await sql`INSERT INTO invites (hash, role, email) VALUES (${hash(invite)}, 'dealer', ${email})`;
      return send(res, 200, { invite });
    }
    reject('Endpoint unavailable.', 404);
  } catch (error) {
    if (!error.status) console.error('Portal request failed:', error.code || error.name);
    send(res, error.status || 500, { error: error.status ? error.message : 'The portal service is temporarily unavailable.' });
  }
}
