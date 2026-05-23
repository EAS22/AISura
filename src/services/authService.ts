import { select, execute } from './db';
import { v4 as uuid } from 'uuid';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hasPassword(): Promise<boolean> {
  const rows = await select<{ id: string }>('SELECT id FROM auth_config LIMIT 1');
  return rows.length > 0;
}

export async function createPassword(password: string, displayName?: string): Promise<void> {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  await execute(
    'INSERT INTO auth_config (id, password_hash, display_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
    [uuid(), hash, displayName || 'Admin', now, now]
  );
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  const rows = await select<{ password_hash: string }>('SELECT password_hash FROM auth_config LIMIT 1');
  if (rows.length === 0) return false;
  return rows[0].password_hash === hash;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const valid = await verifyPassword(oldPassword);
  if (!valid) return false;
  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await execute('UPDATE auth_config SET password_hash = $1, updated_at = $2', [newHash, now]);
  return true;
}

export async function getDisplayName(): Promise<string> {
  const rows = await select<{ display_name: string }>('SELECT display_name FROM auth_config LIMIT 1');
  return rows.length > 0 ? rows[0].display_name : 'Admin';
}

export async function updateDisplayName(name: string): Promise<void> {
  const now = new Date().toISOString();
  await execute('UPDATE auth_config SET display_name = $1, updated_at = $2', [name, now]);
}
