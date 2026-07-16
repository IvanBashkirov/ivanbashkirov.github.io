/* Drum pads + hidden-track unlock (§8.3). Pattern: ● ● ▲ ● = KCK KCK SNR KCK within 3s. */

import { $, $$, statusFlash } from './util';
import * as sfx from './audio';

const UNLOCK_KEY = 'ib01-hidden';
const PATTERN = ['kck', 'kck', 'snr', 'kck'];

let history: Array<{ pad: string; t: number }> = [];
let sndHintShown = false;

function unlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function revealDisk(): void {
  $('#hiddenDisk')?.removeAttribute('hidden');
}

function unlock(): void {
  // nothing to unlock when no hidden disk is on file (empty device)
  if (!document.getElementById('hiddenDisk')) return;
  if (unlocked()) return;
  try {
    localStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
  statusFlash('HIDDEN TRACK UNLOCKED', 4000);
  revealDisk();
}

function hit(button: HTMLElement): void {
  const name = button.dataset.pad!;
  if (!sfx.soundOn() && !sndHintShown) {
    sndHintShown = true;
    statusFlash('SOUND IS OFF → FLIP SND SWITCH', 3000);
  }
  sfx.pad(name);

  const cell = button.closest('.pad-cell');
  cell?.classList.add('flash');
  button.classList.add('hit');
  window.setTimeout(() => {
    cell?.classList.remove('flash');
    button.classList.remove('hit');
  }, 150);

  const now = performance.now();
  history.push({ pad: name, t: now });
  history = history.slice(-PATTERN.length);
  if (
    history.length === PATTERN.length &&
    history.every((h, i) => h.pad === PATTERN[i]) &&
    now - history[0].t <= 3000
  ) {
    history = [];
    unlock();
  }
}

export function initPads(): void {
  if (unlocked()) revealDisk();
  for (const pad of $$('.pad')) {
    pad.addEventListener('pointerdown', () => hit(pad));
    pad.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        hit(pad);
      }
    });
  }
}
