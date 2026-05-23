import type { DetectedPlaceholder, PlaceholderKategori } from '../types';
import { DESA_TOKENS, NOMOR_SURAT_TOKENS, PERANGKAT_DESA_ALIASES } from '../constants/placeholders';
import type { TextModifier } from './textTransform';

const PLACEHOLDER_REGEX = /\{([A-Z0-9_]+)\}/g;
const MODIFIER_REGEX = /^(.+?)_(U|L|P)$/;

export function detectPlaceholders(xmlContent: string): DetectedPlaceholder[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(xmlContent)) !== null) {
    matches.add(match[1]);
  }

  const placeholders: DetectedPlaceholder[] = [];

  for (const raw of matches) {
    let token = raw;
    let modifier: TextModifier | undefined;
    const modMatch = MODIFIER_REGEX.exec(raw);
    if (modMatch) {
      const possibleToken = modMatch[1];
      const possibleMod = modMatch[2] as TextModifier;
      if (isKnownToken(possibleToken)) {
        token = possibleToken;
        modifier = possibleMod;
      }
    }

    const kategori = classifyToken(token);
    const slot = extractSlot(token);
    const field = extractField(token);

    placeholders.push({ token: raw, kategori, field, modifier, slot });
  }

  return placeholders;
}

function isKnownToken(token: string): boolean {
  if (/^W\d+_/.test(token)) return true;
  if (/^PD\d+_/.test(token)) return true;
  if (DESA_TOKENS.includes(token)) return true;
  if (NOMOR_SURAT_TOKENS.includes(token)) return true;
  if (token in PERANGKAT_DESA_ALIASES) return true;
  return false;
}

function classifyToken(token: string): PlaceholderKategori {
  if (/^W\d+_/.test(token)) return 'warga';
  if (/^PD\d+_/.test(token)) return 'perangkat_desa';
  if (token in PERANGKAT_DESA_ALIASES) return 'perangkat_desa';
  if (NOMOR_SURAT_TOKENS.includes(token) || token === 'NOMOR_SURAT') return 'nomor_surat';
  if (DESA_TOKENS.includes(token)) return 'desa';
  return 'custom';
}

function extractSlot(token: string): string | undefined {
  const wargaMatch = token.match(/^(W\d+)_/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^(PD\d+)_/);
  if (pdMatch) return pdMatch[1];

  if (token in PERANGKAT_DESA_ALIASES) {
    const resolved = PERANGKAT_DESA_ALIASES[token];
    const m = resolved.match(/^(PD\d+)_/);
    return m ? m[1] : undefined;
  }

  return undefined;
}

function extractField(token: string): string {
  const wargaMatch = token.match(/^W\d+_(.+)$/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^PD\d+_(.+)$/);
  if (pdMatch) return pdMatch[1];

  return token;
}

export function countWargaSlots(placeholders: DetectedPlaceholder[]): number {
  const slots = new Set<string>();
  for (const p of placeholders) {
    if (p.kategori === 'warga' && p.slot) {
      slots.add(p.slot);
    }
  }
  return slots.size;
}
