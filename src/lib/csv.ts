import Papa from 'papaparse';
import type { ImportPreview, ImportRow, ImportValidationError, Round } from '../types';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Max lengths for free-text fields to prevent LocalStorage quota exhaustion. */
export const MAX_COURSE_NAME_LEN = 80;
export const MAX_NOTES_LEN = 280;

/**
 * Neutralize CSV formula injection (OWASP CSV Injection).
 * Cells beginning with =, +, -, @, tab, or CR are evaluated as formulas by
 * Excel / Sheets / LibreOffice, so prefix them with a single quote on export.
 */
function sanitizeCsvField<T>(value: T): T | string {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export const CSV_HEADERS = [
  'date',
  'courseName',
  'score',
  'par',
  'front9',
  'back9',
  'putts',
  'gir',
  'fir',
  'yardage',
  'notes',
] as const;

function parseNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).trim().replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a percentage from Excel/CSV cells.
 * Accepts: 45, "45%", "45 %", 0.45 (as fraction → 45).
 */
export function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  let s = String(value).trim().replace(/,/g, '');
  if (!s) return null;

  const hasPercentSign = s.includes('%');
  s = s.replace(/%/g, '').trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  // Explicit % sign, or value clearly already a percent scale
  if (hasPercentSign) {
    return round1(n);
  }
  // Decimal fraction (e.g. Excel 0.45 formatted as percent storage)
  if (n > 0 && n <= 1) {
    return round1(n * 100);
  }
  return round1(n);
}

function isValidPercent(n: number): boolean {
  return n >= 0 && n <= 100;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function pickField(raw: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (raw[key] !== undefined && String(raw[key]).trim() !== '') {
      return raw[key];
    }
    // case-insensitive header match
    const found = Object.keys(raw).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && String(raw[found]).trim() !== '') {
      return raw[found];
    }
  }
  return undefined;
}

export function parseImportCsv(
  text: string,
  existingRounds: Round[],
): ImportPreview {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors: ImportValidationError[] = [];
  const rows: ImportRow[] = [];
  const duplicates: number[] = [];

  const existingKeys = new Set(
    existingRounds.map((r) => `${r.date}|${r.courseName}|${r.score}`),
  );

  parsed.data.forEach((raw, index) => {
    const rowNum = index + 2; // header is row 1
    const date = String(pickField(raw, ['date', 'Date']) ?? '').trim();
    const courseName = String(
      pickField(raw, ['courseName', 'course', 'Course', 'Course Name', 'course name']) ?? '',
    ).trim();
    const score = parseNum(pickField(raw, ['score', 'Score']));
    const par = parseNum(pickField(raw, ['par', 'Par'])) ?? 72;
    const front9 = parseNum(pickField(raw, ['front9', 'Front9', 'front 9', 'F9']));
    const back9 = parseNum(pickField(raw, ['back9', 'Back9', 'back 9', 'B9']));
    const putts = parseNum(pickField(raw, ['putts', 'Putts']));
    const gir = parsePercent(pickField(raw, ['gir', 'GIR', 'gir%', 'GIR%']));
    // FIR preferred; legacy fairwaysHit/fairwaysTotal still accepted
    let fir = parsePercent(pickField(raw, ['fir', 'FIR', 'fir%', 'FIR%', 'fairway', 'Fairway']));
    if (fir === null) {
      const hit = parseNum(pickField(raw, ['fairwaysHit', 'fairways hit', 'fwHit']));
      const total = parseNum(pickField(raw, ['fairwaysTotal', 'fairways total', 'fwTotal'])) ?? 14;
      if (hit !== null && total > 0) {
        fir = round1((hit / total) * 100);
      }
    }
    const yardage = parseNum(pickField(raw, ['yardage', 'Yardage', 'yards'])) ?? 6500;
    const notesRaw = pickField(raw, ['notes', 'Notes', 'note']);
    const notes = notesRaw ? String(notesRaw).trim() : undefined;

    let rowHasError = false;

    if (!date || !isValidDate(date)) {
      errors.push({ row: rowNum, field: 'date', message: 'Date must be YYYY-MM-DD' });
      rowHasError = true;
    }
    if (!courseName) {
      errors.push({ row: rowNum, field: 'courseName', message: 'Course name is required' });
      rowHasError = true;
    } else if (courseName.length > MAX_COURSE_NAME_LEN) {
      errors.push({
        row: rowNum,
        field: 'courseName',
        message: `Course name must be ${MAX_COURSE_NAME_LEN} characters or fewer`,
      });
      rowHasError = true;
    }
    if (notes && notes.length > MAX_NOTES_LEN) {
      errors.push({
        row: rowNum,
        field: 'notes',
        message: `Notes must be ${MAX_NOTES_LEN} characters or fewer`,
      });
      rowHasError = true;
    }
    if (score === null || score < 50 || score > 150) {
      errors.push({ row: rowNum, field: 'score', message: 'Score must be 50–150' });
      rowHasError = true;
    }
    if (front9 === null || back9 === null) {
      errors.push({
        row: rowNum,
        field: 'front9/back9',
        message: 'Front 9 and Back 9 are required',
      });
      rowHasError = true;
    } else if (score !== null && front9 + back9 !== score) {
      errors.push({
        row: rowNum,
        field: 'score',
        message: `Front+Back (${front9 + back9}) must equal score (${score})`,
      });
      rowHasError = true;
    }
    if (putts === null || putts < 10 || putts > 60) {
      errors.push({ row: rowNum, field: 'putts', message: 'Putts must be 10–60' });
      rowHasError = true;
    }
    if (gir === null || !isValidPercent(gir)) {
      errors.push({
        row: rowNum,
        field: 'gir',
        message: 'GIR must be a percentage 0–100 (e.g. 45 or 45%)',
      });
      rowHasError = true;
    }
    if (fir === null || !isValidPercent(fir)) {
      errors.push({
        row: rowNum,
        field: 'fir',
        message: 'FIR must be a percentage 0–100 (e.g. 57 or 57%)',
      });
      rowHasError = true;
    }

    if (
      rowHasError ||
      score === null ||
      front9 === null ||
      back9 === null ||
      putts === null ||
      gir === null ||
      fir === null
    ) {
      return;
    }

    const row: ImportRow = {
      date,
      courseName,
      score,
      par,
      front9,
      back9,
      putts,
      gir,
      fir,
      yardage,
      notes,
    };

    const key = `${date}|${courseName}|${score}`;
    if (existingKeys.has(key)) {
      duplicates.push(rowNum);
    }

    rows.push(row);
  });

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      errors.push({
        row: (e.row ?? 0) + 2,
        field: 'parse',
        message: e.message,
      });
    }
  }

  return {
    rows,
    errors,
    duplicates,
    validCount: rows.length,
  };
}

export function importRowsToRounds(
  rows: ImportRow[],
  skipDuplicateRows: Set<number>,
  existingRounds: Round[],
): Round[] {
  const existingKeys = new Set(
    existingRounds.map((r) => `${r.date}|${r.courseName}|${r.score}`),
  );

  const newRounds: Round[] = [];
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (skipDuplicateRows.has(rowNum)) return;
    const key = `${row.date}|${row.courseName}|${row.score}`;
    if (existingKeys.has(key)) return;

    const courseId = slugify(row.courseName);
    newRounds.push({
      id: `rnd-${row.date}-${courseId}-${Date.now()}-${i}`,
      date: row.date,
      courseId,
      courseName: row.courseName,
      score: row.score,
      par: row.par,
      front9: row.front9,
      back9: row.back9,
      putts: row.putts,
      gir: row.gir,
      fir: row.fir,
      yardage: row.yardage,
      notes: row.notes,
    });
    existingKeys.add(key);
  });

  return newRounds;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  courseName?: string;
  season?: string;
  includeStats?: boolean;
}

export function filterRoundsForExport(
  rounds: Round[],
  filters: ExportFilters,
): Round[] {
  return rounds.filter((r) => {
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    if (
      filters.courseName &&
      filters.courseName !== 'all' &&
      r.courseName !== filters.courseName
    ) {
      return false;
    }
    if (filters.season && filters.season !== 'all') {
      if (/^\d{4}$/.test(filters.season)) {
        if (!r.date.startsWith(filters.season)) return false;
      } else {
        const month = Number(r.date.slice(5, 7));
        const seasonMap: Record<string, number[]> = {
          spring: [3, 4, 5],
          summer: [6, 7, 8],
          fall: [9, 10, 11],
          winter: [12, 1, 2],
        };
        const months = seasonMap[filters.season];
        if (months && !months.includes(month)) return false;
      }
    }
    return true;
  });
}

export function exportRoundsCsv(rounds: Round[]): string {
  const data = rounds.map((r) => ({
    date: r.date,
    courseName: sanitizeCsvField(r.courseName),
    score: r.score,
    par: r.par,
    front9: r.front9,
    back9: r.back9,
    putts: r.putts,
    gir: r.gir,
    fir: r.fir,
    yardage: r.yardage,
    notes: sanitizeCsvField(r.notes ?? ''),
  }));
  return Papa.unparse(data, { columns: [...CSV_HEADERS] });
}

export function exportStatsCsv(
  stats: {
    courseName: string;
    rounds: number;
    bestScore: number;
    averageScore: number;
    lowestFront9: number;
    lowestBack9: number;
    bestPutting: number;
    bestGir: number;
    bestFir: number;
    lastPlayed: string;
  }[],
): string {
  const data = stats.map((s) => ({
    ...s,
    courseName: sanitizeCsvField(s.courseName),
  }));
  return Papa.unparse(data);
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
