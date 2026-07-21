/* 404 behaviors (§5.3): RETRY reloads, IGNORE counts. */

import { $, mode } from './util';
import * as sfx from './audio';

export function initErr(): void {
  if (mode() !== 'error') return;

  $('#errRetry')?.addEventListener('click', () => location.reload());

  let ignored = 0;
  $('#errIgnore')?.addEventListener('click', () => {
    ignored++;
    sfx.click();
    const wrap = $('#errIgnored');
    const n = $('#errIgnoredN');
    if (wrap) wrap.hidden = false;
    if (n) n.textContent = String(ignored);
  });
}
