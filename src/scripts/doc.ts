/* Doc mode HUD (§4.4): scroll progress blocks + % ↔ TRK alternation. */

import { $, $$, isEink, reduced } from './util';

export function initDoc(): void {
  if (!isEink()) return;
  const blocks = $$('#hudBlocks i');
  const pctEl = $('#hudPct');
  if (!pctEl) return;

  let pct = 0;
  let showTrk = false;
  let raf = 0;

  const renderPct = () => {
    pctEl.textContent = showTrk
      ? `TRK ${String(Math.round((pct / 100) * 79)).padStart(2, '0')}/79`
      : `${pct}%`;
  };

  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
    pct = Math.max(0, Math.min(100, pct));
    const filled = Math.round((pct / 100) * blocks.length);
    blocks.forEach((b, i) => b.classList.toggle('fill', i < filled));
    renderPct();
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!raf) raf = requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();

  // drive fiction: alternate % and TRK every 6s (§4.4); skip under reduced motion
  if (!reduced()) {
    window.setInterval(() => {
      showTrk = !showTrk;
      renderPct();
    }, 6000);
  }
}
