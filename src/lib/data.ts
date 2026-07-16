import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export interface LogEntry {
  n: number;
  date: string; // YYYY-MM-DD
  type: 'ship' | 'txt' | 'note';
  text: string;
  doc?: string;
  project?: string;
}

export interface Project {
  ch: string;
  name: string;
  status: 'rec' | 'out' | 'mute' | 'stby';
  desc: string;
  link?: string;
  year: string;
}

export interface SiteMeta {
  title: string;
  domain: string;
  serial: string;
  email: string;
  x: string;
  github: string;
  londonDeparture: string;
  tunesLogged: number;
  bio: string;
}

const read = (p: string) => readFileSync(new URL(`../../content/${p}`, import.meta.url), 'utf8');

function normalizeDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d);
}

export function loadSite(): SiteMeta {
  const s = parse(read('site.yaml')) as SiteMeta & { londonDeparture: unknown };
  return { ...s, londonDeparture: normalizeDate(s.londonDeparture) };
}

/** Entries sorted newest-first. */
export function loadLog(): LogEntry[] {
  const raw = parse(read('log.yaml')) as (LogEntry & { date: unknown })[];
  return raw
    .map((e) => ({ ...e, date: normalizeDate(e.date) }))
    .sort((a, b) => (a.date === b.date ? b.n - a.n : b.date.localeCompare(a.date)));
}

export function loadProjects(): Project[] {
  return parse(read('projects.yaml')) as Project[];
}

export const latestShip = (log: LogEntry[]) => log.find((e) => e.type === 'ship');

/** Build-time days-since fallback; client recomputes against the visitor's clock. */
export function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - Date.UTC(y, m - 1, d)) / 864e5));
}

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
