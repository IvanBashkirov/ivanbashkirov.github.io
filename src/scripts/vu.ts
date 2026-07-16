/* Gentle VU flicker on REC channel rows (§4.2). */

import { $$, reduced } from './util';

export function initVu(): void {
  const meters = $$('.chan[data-status="rec"] .vu');
  if (!meters.length) return;

  const setBars = (vu: HTMLElement) => {
    for (const bar of Array.from(vu.children) as HTMLElement[]) {
      bar.style.height = `${3 + Math.round(Math.random() * 9)}px`;
    }
  };

  for (const vu of meters) {
    setBars(vu);
    if (reduced()) continue;
    const loop = () => {
      setBars(vu);
      window.setTimeout(loop, 800 + Math.random() * 600);
    };
    window.setTimeout(loop, 400 + Math.random() * 600);
  }
}
