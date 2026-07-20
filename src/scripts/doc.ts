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
    // page scroll on desktop; in handheld mode the page is fixed and the
    // screen's inner window is the scroll surface instead
    const inner = $('#screenInner');
    const winMax = document.documentElement.scrollHeight - window.innerHeight;
    const innerMax = inner ? inner.scrollHeight - inner.clientHeight : 0;
    const max = winMax > 0 ? winMax : innerMax;
    const pos = winMax > 0 ? window.scrollY : (inner?.scrollTop ?? 0);
    pct = max > 0 ? Math.round((pos / max) * 100) : 100;
    pct = Math.max(0, Math.min(100, pct));
    const filled = Math.round((pct / 100) * blocks.length);
    blocks.forEach((b, i) => b.classList.toggle('fill', i < filled));
    renderPct();
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  $('#screenInner')?.addEventListener('scroll', onScroll, { passive: true });
  update();

  // drive fiction: alternate % and TRK every 6s (§4.4); skip under reduced motion
  if (!reduced()) {
    window.setInterval(() => {
      showTrk = !showTrk;
      renderPct();
    }, 6000);
  }
}
