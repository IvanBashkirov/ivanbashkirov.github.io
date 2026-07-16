/* FILTER knob (§8.1): 4 detents, click to cycle, drag to rotate, keyboard slider. */

import { $, $$, statusFlash } from './util';
import * as sfx from './audio';

const FILTERS = ['all', 'ship', 'txt', 'note'] as const;
const LABELS = ['All entries', 'Shipments only', 'Written entries only', 'Notes only'];

let idx = 0;

function applyFilter(): void {
  const f = FILTERS[idx];
  for (const panel of ['#panel-activity', '#panel-writing']) {
    const root = $(panel);
    if (!root) continue;
    for (const el of $$('[data-type]', root)) {
      el.classList.toggle('filtered-out', f !== 'all' && el.dataset.type !== f);
    }
    for (const group of $$('.month-group', root)) {
      const anyVisible = $$('[data-type]', group).some(
        (el) => !el.classList.contains('filtered-out')
      );
      group.classList.toggle('empty', !anyVisible);
    }
  }
}

function renderKnob(): void {
  const cap = $('#knobCap');
  const knob = $('#knob');
  if (cap) cap.style.transform = `rotate(${-22.5 + idx * 15}deg)`;
  if (knob) {
    knob.setAttribute('aria-valuenow', String(idx));
    knob.setAttribute('aria-valuetext', LABELS[idx]);
  }
  $$('.knob-labels span').forEach((s, i) => s.classList.toggle('active', i === idx));
}

export function setFilter(i: number, silent = false): void {
  const next = ((i % FILTERS.length) + FILTERS.length) % FILTERS.length;
  if (next === idx) return;
  idx = next;
  renderKnob();
  applyFilter();
  if (!silent) {
    sfx.detent();
    statusFlash(`FILTER: ${FILTERS[idx].toUpperCase()}`);
  }
}

export const cycleFilter = (): void => setFilter(idx + 1);

export function initKnob(): void {
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
    const target = Math.min(3, Math.max(0, dragBase + steps));
    setFilter(target);
  });

  knob.addEventListener('pointerup', () => (dragging = false));
  knob.addEventListener('pointercancel', () => (dragging = false));

  knob.addEventListener('click', () => {
    if (moved) {
      moved = false;
      return; // drag already applied
    }
    cycleFilter();
  });

  knob.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFilter(Math.min(3, idx + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFilter(Math.max(0, idx - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFilter(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFilter(3);
    }
  });
}
