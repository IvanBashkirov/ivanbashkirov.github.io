/* Screensaver (§5.2): after 90s idle on log modes, DVD-logo physics on the LCD. */

import { $, isLogPage, reduced } from './util';
import { dayLabel } from './counter';

const IDLE_MS = 90_000;

export function initSaver(): void {
  if (!isLogPage() || reduced()) return;
  const overlay = $('#saver');
  const block = $('#saverBlock');
  const screen = $('#screen');
  if (!overlay || !block || !screen) return;

  let idleTimer: number;
  let raf = 0;
  let active = false;

  let x = 30, y = 40, vx = 1.4, vy = 1.1;

  const tick = () => {
    if (!active) return;
    // bounce within the viewport-visible band of the (possibly tall) screen
    const r = screen.getBoundingClientRect();
    const bandTop = Math.max(0, -r.top);
    const bandBottom = Math.min(r.height, window.innerHeight - r.top);
    const bw = block.offsetWidth;
    const bh = block.offsetHeight;
    if (bandBottom - bandTop < bh + 10) {
      raf = requestAnimationFrame(tick);
      return;
    }
    x += vx;
    y += vy;
    let cornerHit = 0;
    if (x <= 0 || x + bw >= r.width) {
      vx = -vx;
      x = Math.max(0, Math.min(x, r.width - bw));
      cornerHit++;
    }
    if (y <= bandTop || y + bh >= bandBottom) {
      vy = -vy;
      y = Math.max(bandTop, Math.min(y, bandBottom - bh));
      cornerHit++;
    }
    if (cornerHit === 2) {
      // corner: subtle LED blink
      const led = $('#driveLed');
      led?.classList.add('on');
      window.setTimeout(() => led?.classList.remove('on'), 180);
    }
    block.style.transform = `translate(${x}px, ${y}px)`;
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (active || document.hidden) return;
    active = true;
    block.textContent = `IB-01 · ${dayLabel()}`;
    overlay.classList.add('show');
    raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (active) {
      active = false;
      overlay.classList.remove('show');
      cancelAnimationFrame(raf);
    }
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(start, IDLE_MS);
  };

  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
    window.addEventListener(ev, stop, { passive: true, capture: true });
  }
  idleTimer = window.setTimeout(start, IDLE_MS);
}
