import { neon } from '@neondatabase/serverless';

export function database() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('Missing database configuration.');
  return neon(url);
}
