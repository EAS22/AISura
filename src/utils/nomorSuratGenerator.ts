const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export interface NomorSuratParts {
  NOMOR_SURAT: string;
  S_NOMOR: string;
  S_BULAN: string;
  S_BULAN_ROM: string;
  S_TAHUN: string;
  S_KODE_DESA: string;
  S_TANGGAL: string;
  S_PREFIX: string;
}

export function generateNomorSuratParts(
  format: string,
  counter: number,
  kodeDesa: string,
  prefix: string = '',
  date: Date = new Date()
): NomorSuratParts {
  const nomor = counter.toString().padStart(3, '0');
  const bulan = (date.getMonth() + 1).toString().padStart(2, '0');
  const bulanRom = BULAN_ROMAWI[date.getMonth()];
  const tahun = date.getFullYear().toString();
  const tanggal = `${date.getDate()} ${BULAN_INDONESIA[date.getMonth()]} ${tahun}`;

  const parts: NomorSuratParts = {
    S_NOMOR: nomor,
    S_BULAN: bulan,
    S_BULAN_ROM: bulanRom,
    S_TAHUN: tahun,
    S_KODE_DESA: kodeDesa,
    S_TANGGAL: tanggal,
    S_PREFIX: prefix,
    NOMOR_SURAT: '',
  };

  let result = format;
  result = result.replace('{S_NOMOR}', nomor);
  result = result.replace('{S_BULAN}', bulan);
  result = result.replace('{S_BULAN_ROM}', bulanRom);
  result = result.replace('{S_TAHUN}', tahun);
  result = result.replace('{S_KODE_DESA}', kodeDesa);
  result = result.replace('{S_PREFIX}', prefix);
  parts.NOMOR_SURAT = result;

  return parts;
}

export function generateMultiNomorParts(
  format: string,
  startCounter: number,
  kodeDesa: string,
  prefix: string = '',
  slotCount: number = 1,
  date: Date = new Date()
): Record<string, NomorSuratParts> {
  const result: Record<string, NomorSuratParts> = {};
  for (let i = 0; i < slotCount; i++) {
    const slot = `N${i + 1}`;
    result[slot] = generateNomorSuratParts(format, startCounter + i, kodeDesa, prefix, date);
  }
  return result;
}
