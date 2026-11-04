export const YEARS = 90;
export const WEEKS_PER_YEAR = 52;
export const TOTAL_WEEKS = YEARS * WEEKS_PER_YEAR; // 4680
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Fecha "YYYY-MM-DD" → milisegundos UTC (evita corrimientos por horario de verano). */
export function parseISODate(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(ms) ? null : ms;
}

export function todayUTC(): number {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Índice de semana (0 = primera semana de vida) de una fecha respecto del nacimiento. */
export function weekIndex(birth: number, date: number): number {
  return Math.floor((date - birth) / WEEK_MS);
}

export function weekStart(birth: number, index: number): Date {
  return new Date(birth + index * WEEK_MS);
}

export function formatDate(ms: number | Date, locale: string): string {
  return new Date(ms).toLocaleDateString(locale, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Variación determinística 0–3 por casilla, para el trazo "a mano". */
export function jitter(index: number): number {
  const h = Math.imul(index + 1, 2654435761) >>> 0;
  const v = h % 7;
  return v < 3 ? v + 1 : 0;
}

export const ROMAN = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX'];
