/* Entry selection cursor (§4.1): blinking ▸, j/k to move, Enter opens attached doc. */

import { $, $$ } from './util';

let current: HTMLElement | null = null;

function activePanel(): HTMLElement | null {
  return $$('.panel').find((p) => !p.hidden) ?? null;
}

function visibleEntries(): HTMLElement[] {
  const panel = activePanel();
  if (!panel) return [];
  return $$('.entry, .t-entry', panel).filter((el) => !el.classList.contains('filtered-out'));
}

function setCursor(el: HTMLElement | null, scroll = false): void {
  current?.classList.remove('cursor');
  current = el;
  if (el) {
    el.classList.add('cursor');
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  }
}

export function moveCursor(dir: 1 | -1): void {
  const entries = visibleEntries();
  if (!entries.length) return;
  const i = current ? entries.indexOf(current) : -1;
  const next = i === -1 ? (dir === 1 ? 0 : entries.length - 1) : Math.min(entries.length - 1, Math.max(0, i + dir));
  setCursor(entries[next], true);
}

export function openCursor(): void {
  if (!current) return;
  const link = $('a[data-doc]', current) as HTMLAnchorElement | null;
  link?.click();
}

export function initCursor(): void {
  document.addEventListener('mouseover', (e) => {
    const entry = (e.target as Element).closest?.('.entry, .t-entry') as HTMLElement | null;
    if (entry && !entry.classList.contains('filtered-out')) setCursor(entry);
  });
  document.addEventListener('focusin', (e) => {
    const entry = (e.target as Element).closest?.('.entry, .t-entry') as HTMLElement | null;
    if (entry) setCursor(entry);
  });
}
