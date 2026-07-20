/** Date formatting shared by the build and the browser (keep node-free). */

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** '2026-07-14' -> '14 JUL 2026' */
export function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MON[Number(m) - 1]} ${y}`;
}

/** '2026-07-14' -> '14 JUL' (the month divider carries the year) */
export function fmtDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d} ${MON[Number(m) - 1]}`;
}

/** '2026-07-14' -> 'JULY 2026' */
export function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export interface MonthGroup<T> {
  label: string;
  items: T[];
}

/** Group date-sorted items into month buckets, preserving order. */
export function groupByMonth<T extends { date: string }>(items: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const label = monthLabel(item.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
