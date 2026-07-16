import { $, $$, isLogPage, onAnyInput, reduced } from './util';
import { bootDigits } from './counter';

const FLAG = 'ib01-boot';

export function initBoot(): void {
  const el = $('#boot');
  if (!el || !isLogPage()) return;

  const firstVisit = document.documentElement.dataset.boot === '1';

  const finish = () => {
    el.classList.remove('show');
    el.style.display = 'none';
    delete document.documentElement.dataset.boot;
    bootDigits(false);
    try {
      sessionStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
  };

  if (!firstVisit) {
    // subsequent loads: a single 300ms flick (§5.1)
    let seen = false;
    try {
      seen = sessionStorage.getItem(FLAG) === '1';
    } catch {
      /* ignore */
    }
    if (seen && !reduced()) {
      el.style.display = 'block';
      el.style.transition = 'opacity 300ms ease';
      requestAnimationFrame(() => {
        el.style.opacity = '0';
        window.setTimeout(() => {
          el.style.display = 'none';
          el.style.opacity = '';
          el.style.transition = '';
        }, 320);
      });
    }
    return;
  }

  // full POST (≤1.8s), any input skips
  bootDigits(true);
  const lines = $$('.boot-line', el);
  const timers: number[] = [];
  lines.forEach((line, i) => {
    timers.push(window.setTimeout(() => line.classList.add('on'), 120 + i * 180));
  });
  const endTimer = window.setTimeout(() => {
    cancelSkip();
    finish();
  }, 120 + lines.length * 180 + 520);

  const cancelSkip = onAnyInput(() => {
    timers.forEach(window.clearTimeout);
    window.clearTimeout(endTimer);
    finish();
  });
}
