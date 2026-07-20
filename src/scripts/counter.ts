/* The 7-segment window is a clock: the device's local time (Tbilisi). */

import { $ } from './util';

let booting = false;

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tbilisi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 'HH:MM' in Tbilisi, for anything else that wants the device time. */
export const timeLabel = (): string => timeFmt.format(new Date());

function render(): void {
  if (booting) return;
  const digits = $('#counterDigits');
  const win = $('#counterWin');
  if (!digits || !win) return;
  const t = timeFmt.format(new Date()); // 'HH:MM'
  const [h, m] = t.split(':');
  digits.innerHTML = `${h}<span class="colon">:</span>${m}`;
  win.setAttribute('aria-label', `Local time in Tbilisi: ${t}`);
}

/** Show all-segments-on during boot; restore after. */
export function bootDigits(on: boolean): void {
  const digits = $('#counterDigits');
  if (!digits) return;
  booting = on;
  if (on) digits.textContent = '88:88';
  else render();
}

export function initCounter(): void {
  render();
  window.setInterval(render, 5000);
}
