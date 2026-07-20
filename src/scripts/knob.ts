/* MODE dial: 3 detents (LOG / PROJ / TXT), click to cycle, drag to rotate,
   keyboard slider. Mirrors the bottom-panel mode buttons. */

import { $, $$, mode } from './util';
import { activate } from './nav';
import * as sfx from './audio';

const MODES = ['activity', 'projects', 'writing'] as const;
const LABELS = ['Log — everything', 'Projects', 'Writing — disk box'];

let idx = 0;

function renderKnob(): void {
  const cap = $('#knobCap');
  const knob = $('#knob');
  if (cap) cap.style.transform = `rotate(${-15 + idx * 15}deg)`;
  if (knob) {
    knob.setAttribute('aria-valuenow', String(idx));
    knob.setAttribute('aria-valuetext', LABELS[idx]);
  }
  $$('.knob-labels span').forEach((s, i) => s.classList.toggle('active', i === idx));
}

export function setDial(i: number, silent = false): void {
  const next = ((i % MODES.length) + MODES.length) % MODES.length;
  if (next === idx) return;
  idx = next;
  renderKnob();
  activate(MODES[idx]);
  if (!silent) sfx.detent();
}

export const cycleDial = (): void => setDial(idx + 1);

export function initKnob(): void {
  // sync the dial with the mode this page loaded in
  idx = Math.max(0, (MODES as readonly string[]).indexOf(mode()));
  renderKnob();

  // nav (keyboard shortcuts, history) may change mode behind the dial's back
  document.addEventListener('ib01:mode', (e) => {
    const m = (e as CustomEvent<string>).detail;
    const i = (MODES as readonly string[]).indexOf(m);
    if (i >= 0 && i !== idx) {
      idx = i;
      renderKnob();
    }
  });

  const knob = $('#knob');
  if (!knob) return;

  let dragging = false;
  let dragStart = 0;
  let dragBase = 0;
  let moved = false;

  knob.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    dragStart = e.clientX + -e.clientY;
    dragBase = idx;
    knob.setPointerCapture(e.pointerId);
  });

  knob.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const delta = e.clientX + -e.clientY - dragStart;
    const steps = Math.round(delta / 30);
    if (steps !== 0) moved = true;
    const target = Math.min(MODES.length - 1, Math.max(0, dragBase + steps));
    setDial(target);
  });

  knob.addEventListener('pointerup', () => (dragging = false));
  knob.addEventListener('pointercancel', () => (dragging = false));

  knob.addEventListener('click', () => {
    if (moved) {
      moved = false;
      return; // drag already applied
    }
    cycleDial();
  });

  knob.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setDial(Math.min(MODES.length - 1, idx + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setDial(Math.max(0, idx - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setDial(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setDial(MODES.length - 1);
    }
  });
}
