import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export * from './dates';

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

/** Entries sorted newest-first. Empty log ships an empty device. */
export function loadLog(): LogEntry[] {
  const raw = (parse(read('log.yaml')) ?? []) as (LogEntry & { date: unknown })[];
  return raw
    .map((e) => ({ ...e, date: normalizeDate(e.date) }))
    .sort((a, b) => (a.date === b.date ? b.n - a.n : b.date.localeCompare(a.date)));
}

export function loadProjects(): Project[] {
  return (parse(read('projects.yaml')) ?? []) as Project[];
}

export const latestShip = (log: LogEntry[]) => log.find((e) => e.type === 'ship');

/** Build-time days-since fallback; client recomputes against the visitor's clock. */
export function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - Date.UTC(y, m - 1, d)) / 864e5));
}
