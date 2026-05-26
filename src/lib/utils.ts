import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

/**
 * Initials from a display name: first character of the first word + first
 * character of the last word. One word only: first two characters. Empty: `?`.
 */
export function getDisplayNameInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  return (first + last).toUpperCase()
}

/**
 * Format nama lengkap perangkat desa dengan tanda baca akademik standar.
 * - Gelar depan diakhiri dengan "." kalau belum ada (mis. "H" → "H.").
 * - Nama lengkap dipisah koma sebelum gelar belakang (mis. "Sena, S.Sos.").
 * - Gelar belakang diakhiri dengan "." kalau belum ada (mis. "S.Sos" → "S.Sos.").
 *
 * Contoh:
 *   formatNamaPerangkat("H", "Sena", "S.Sos") → "H. Sena, S.Sos."
 *   formatNamaPerangkat("", "Sena", "")       → "Sena"
 *   formatNamaPerangkat("Drs.", "Sena", "")   → "Drs. Sena"
 *   formatNamaPerangkat("", "Sena", "M.Pd.")  → "Sena, M.Pd."
 */
export function formatNamaPerangkat(
  gelarDepan?: string | null,
  nama?: string | null,
  gelarBelakang?: string | null,
): string {
  const namaCore = (nama || '').trim()
  if (!namaCore) return ''

  const depanRaw = (gelarDepan || '').trim()
  const belakangRaw = (gelarBelakang || '').trim()

  const depan = depanRaw && !depanRaw.endsWith('.') ? `${depanRaw}.` : depanRaw
  const belakang = belakangRaw && !belakangRaw.endsWith('.') ? `${belakangRaw}.` : belakangRaw

  let result = namaCore
  if (depan) result = `${depan} ${result}`
  if (belakang) result = `${result}, ${belakang}`
  return result
}
