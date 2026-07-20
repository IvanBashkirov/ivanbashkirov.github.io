/* Handheld mode (§10.2): on phones the chassis is fixed in the viewport,
   so wheel/touch gestures that land on the chassis are redirected into the
   active scroll surface — the screen, or the rear panel when flipped. */

import { $ } from './util';
import { isFlipped } from './nav';

// keep in sync with the handheld media block in device.css
const mq = matchMedia('(max-width: 720px) and (min-height: 480px)');

function scroller(): HTMLElement | null {
  return isFlipped() ? $('#rearFace') : $('#screenInner');
}

export function initHandheld(): void {
  if (!$('#screenInner')) return;

  document.addEventListener(
    'wheel',
    (e) => {
      if (!mq.matches) return;
      const s = scroller();
      if (!s || s.contains(e.target as Node)) return; // native scroll inside the window
      e.preventDefault();
      s.scrollTop += e.deltaY;
    },
    { passive: false }
  );

  let lastY = 0;
  let tracking = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      tracking = false;
      if (!mq.matches || e.touches.length !== 1) return;
      const t = e.target as Element;
      if (t.closest?.('#knob')) return; // the knob owns its drag gesture
      const s = scroller();
      tracking = !!s && !s.contains(t);
      lastY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking || !mq.matches) return;
      const s = scroller();
      if (!s) return;
      const y = e.touches[0].clientY;
      s.scrollTop += lastY - y;
      lastY = y;
      e.preventDefault(); // no page rubber-banding — the chassis never moves
    },
    { passive: false }
  );
}
