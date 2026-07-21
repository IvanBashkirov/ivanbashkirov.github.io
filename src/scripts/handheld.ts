/* Chassis lock (§10.2): the device is fixed in the viewport at every size,
   so wheel/touch gestures that land on the chassis are redirected into the
   active scroll surface — the screen, or the rear panel when flipped.
   A horizontal swipe anywhere on the unit flips it to the rear and back. */

import { $ } from './util';
import { flip, isFlipped } from './nav';

const SWIPE_MIN_X = 60; // px of horizontal travel that counts as a swipe
const SWIPE_MAX_MS = 600; // slower than this is a drag/select, not a swipe

// keep in sync with the chassis-lock media block in device.css
const mq = matchMedia('(min-height: 480px)');

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
  let swipeStart: { x: number; y: number; t: number } | null = null;

  document.addEventListener(
    'touchstart',
    (e) => {
      tracking = false;
      swipeStart = null;
      if (e.touches.length !== 1) return;
      const t = e.target as Element;
      if (t.closest?.('#knob')) return; // the knob owns its drag gesture
      // horizontally scrollable content owns its own sideways gesture
      if (!t.closest?.('pre, table')) {
        swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      }
      if (!mq.matches) return;
      const s = scroller();
      tracking = !!s && !s.contains(t);
      lastY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (!swipeStart) return;
      const { x, y, t } = swipeStart;
      swipeStart = null;
      const touch = e.changedTouches[0];
      if (!touch || Date.now() - t > SWIPE_MAX_MS) return;
      const dx = touch.clientX - x;
      const dy = touch.clientY - y;
      if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      flip(!isFlipped());
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
