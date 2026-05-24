import type { DetectedPlaceholder, PlaceholderKategori } from '../types';
import { DESA_TOKENS, NOMOR_SURAT_TOKENS, PERANGKAT_DESA_ALIASES, WARGA_FIELDS, PERANGKAT_DESA_FIELDS, NOMOR_SURAT_FIELDS } from '../constants/placeholders';
import type { TextModifier } from './textTransform';

const PLACEHOLDER_REGEX = /\{([A-Z0-9_]+)\}/g;
const MODIFIER_REGEX = /^(.+?)_(U|L|P)$/;

/**
 * Strip XML tags and normalize whitespace to get plain text content.
 * This handles cases where Word splits placeholder text across multiple XML runs.
 * e.g., <w:t>{W1_</w:t></w:r><w:r><w:t>NAMA}</w:t> → {W1_NAMA}
 */
function stripXmlTags(xml: string): string {
  // First, extract only text within <w:t> or <w:t xml:space="preserve"> tags
  const textParts: string[] = [];
  const wtRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = wtRegex.exec(xml)) !== null) {
    textParts.push(m[1]);
  }
  // If no <w:t> found, fallback to stripping all tags
  if (textParts.length === 0) {
    return xml.replace(/<[^>]+>/g, '');
  }
  return textParts.join('');
}

export function detectPlaceholders(xmlContent: string): DetectedPlaceholder[] {
  const plainText = stripXmlTags(xmlContent);
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(plainText)) !== null) {
    matches.add(match[1]);
  }

  const placeholders: DetectedPlaceholder[] = [];

  for (const raw of matches) {
    let token = raw;
    let modifier: TextModifier | undefined;
    
    // Only check for modifier if token ends with _U, _L, or _P
    // AND the part before is a recognized full token
    const modMatch = MODIFIER_REGEX.exec(raw);
    if (modMatch) {
      const possibleToken = modMatch[1];
      const possibleMod = modMatch[2] as TextModifier;
      // Verify the base token is actually known (not just prefix match)
      if (isKnownBaseToken(possibleToken)) {
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

/**
 * Stricter check: verify the field part (after prefix) is a known field name.
 * This prevents false modifier detection like W1_ALAMAT_LENGKAP being split into
 * token="W1_ALAMAT_LENGKA" + modifier="P"
 */
function isKnownBaseToken(token: string): boolean {
  const wargaMatch = token.match(/^W\d+_(.+)$/);
  if (wargaMatch) {
    return (WARGA_FIELDS as readonly string[]).includes(wargaMatch[1]);
  }
  const pdMatch = token.match(/^PD\d+_(.+)$/);
  if (pdMatch) {
    return (PERANGKAT_DESA_FIELDS as readonly string[]).includes(pdMatch[1]);
  }
  const nomorMatch = token.match(/^N\d+_(.+)$/);
  if (nomorMatch) {
    return (NOMOR_SURAT_FIELDS as readonly string[]).includes(nomorMatch[1]);
  }
  if (DESA_TOKENS.includes(token)) return true;
  if (NOMOR_SURAT_TOKENS.includes(token)) return true;
  if (token in PERANGKAT_DESA_ALIASES) return true;
  return false;
}

function classifyToken(token: string): PlaceholderKategori {
  if (/^W\d+_/.test(token)) return 'warga';
  if (/^PD\d+_/.test(token)) return 'perangkat_desa';
  if (token in PERANGKAT_DESA_ALIASES) return 'perangkat_desa';
  if (/^N\d+_/.test(token)) return 'nomor_surat';
  if (NOMOR_SURAT_TOKENS.includes(token) || token === 'NOMOR_SURAT') return 'nomor_surat';
  if (DESA_TOKENS.includes(token)) return 'desa';
  return 'custom';
}

function extractSlot(token: string): string | undefined {
  const wargaMatch = token.match(/^(W\d+)_/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^(PD\d+)_/);
  if (pdMatch) return pdMatch[1];

  const nomorMatch = token.match(/^(N\d+)_/);
  if (nomorMatch) return nomorMatch[1];

  if (token in PERANGKAT_DESA_ALIASES) {
    const resolved = PERANGKAT_DESA_ALIASES[token];
    const m = resolved.match(/^(PD\d+)_/);
    return m ? m[1] : undefined;
  }

  // Unslotted nomor surat tokens → slot N1
  if (NOMOR_SURAT_TOKENS.includes(token) || token === 'NOMOR_SURAT') return 'N1';

  return undefined;
}

function extractField(token: string): string {
  const wargaMatch = token.match(/^W\d+_(.+)$/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^PD\d+_(.+)$/);
  if (pdMatch) return pdMatch[1];

  const nomorMatch = token.match(/^N\d+_(.+)$/);
  if (nomorMatch) return nomorMatch[1];

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

export function countNomorSlots(placeholders: DetectedPlaceholder[]): number {
  const slots = new Set<string>();
  for (const p of placeholders) {
    if (p.kategori === 'nomor_surat' && p.slot) {
      slots.add(p.slot);
    }
  }
  return slots.size;
}
