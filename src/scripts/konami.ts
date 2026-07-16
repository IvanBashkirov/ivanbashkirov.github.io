/* ↑↑↓↓←→←→BA → TEST MODE diagnostics screen (§8.4). Read-only flavor. */

import { $, isLogPage } from './util';

const SEQ = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

let pos = 0;

function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  return Math.max(
    0,
    Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / 864e5)
  );
}

function show(): void {
  const el = $('#testmode');
  if (!el) return;
  const b = document.body.dataset;
  const uptime = b.london ? daysSince(b.london) : '???';
  el.innerHTML = `<div class="tm-inner">
    <div class="testmode-title">IB-01 TEST MODE</div>
    <div class="testmode-line">UPTIME SINCE LONDON: ${uptime} DAYS</div>
    <div class="testmode-line">ENTRIES: ${b.entries ?? '??'}</div>
    <div class="testmode-line">TUNES LOGGED: ${b.tunes ?? '??'}</div>
    <div class="testmode-line">RESEARCH HOURS: [REDACTED]</div>
    <div class="testmode-line">WARRANTY: VOID — SEE FRONT LABEL</div>
    <div class="testmode-line" style="margin-top:14px">ESC TO EXIT</div>
  </div>`;
  el.classList.add('show');
}

export function testModeOpen(): boolean {
  return !!$('#testmode')?.classList.contains('show');
}

export function testModeClose(): void {
  $('#testmode')?.classList.remove('show');
}

export function initKonami(): void {
  if (!isLogPage()) return;
  window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === SEQ[pos]) {
      pos++;
      if (pos === SEQ.length) {
        pos = 0;
        show();
      }
    } else {
      pos = key === SEQ[0] ? 1 : 0;
    }
  });
}
