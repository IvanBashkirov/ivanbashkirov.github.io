/* Mode switching (driven by the dial + keyboard) + rear-panel flip + popstate. */

import { $, mode, reduced } from './util';
import * as sfx from './audio';

const ROUTES: Record<string, string> = {
  activity: '/',
  projects: '/projects',
  writing: '/writing',
  notes: '/notes',
};
const TITLES: Record<string, string> = {
  activity: 'IVAN BASHKIROV — IB-01 · SHIPPING LOG',
  projects: 'PROJECTS — IB-01 · IVAN BASHKIROV',
  writing: 'WRITING — IB-01 · IVAN BASHKIROV',
  notes: 'NOTES — IB-01 · IVAN BASHKIROV',
};

const hasPanels = (): boolean => !!$('#panel-activity');

function modeFor(path: string): string | null {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return 'activity';
  if (p === '/projects') return 'projects';
  if (p === '/writing') return 'writing';
  if (p === '/notes') return 'notes';
  if (p === '/rear') return 'rear';
  return null;
}

/** LCD brightness flick on mode change (mockup behavior). */
function flickScreen(): void {
  const screen = $('#screen');
  if (!screen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  screen.classList.remove('flick');
  void screen.offsetWidth; // restart animation
  screen.classList.add('flick');
}

export function activate(m: string, push = true): void {
  if (!hasPanels() || !ROUTES[m]) return;
  if (document.body.dataset.mode !== m) flickScreen();
  for (const id of Object.keys(ROUTES)) {
    const panel = $(`#panel-${id}`);
    if (panel) panel.hidden = id !== m;
  }
  const statusMode = $('#statusMode');
  const statusInfo = $('#statusInfo');
  const panel = $(`#panel-${m}`);
  if (statusMode) statusMode.textContent = `MODE: ${m.toUpperCase()}`;
  if (statusInfo && panel) statusInfo.textContent = `${panel.dataset.count} · PWR ∞`;
  document.body.dataset.mode = m;
  document.title = TITLES[m];
  if (push && modeFor(location.pathname) !== m) history.pushState({ m }, '', ROUTES[m]);
  // keep the dial (and anything else listening) in step
  document.dispatchEvent(new CustomEvent('ib01:mode', { detail: m }));
}

/* ---------------- rear flip (§7) ---------------- */

const unit = () => $('#unit');

export const isFlipped = (): boolean =>
  !!unit()?.classList.contains('flipped') || mode() === 'rear';

function setInert(flipped: boolean): void {
  const front = $('.face-front');
  const rear = $('#rearFace');
  window.setTimeout(() => {
    if (flipped) {
      front?.setAttribute('inert', '');
      rear?.removeAttribute('inert');
    } else {
      rear?.setAttribute('inert', '');
      front?.removeAttribute('inert');
    }
  }, 620);
  // the face being revealed must be interactive immediately
  if (flipped) $('#rearFace')?.removeAttribute('inert');
  else $('.face-front')?.removeAttribute('inert');
}

let flippedViaPush = false;

export function flip(on: boolean, push = true): void {
  const u = unit();
  if (!u) return;
  if (on === isFlipped()) return;
  sfx.click();
  setInert(on);
  if (on) {
    u.classList.add('flipped');
    if (push) {
      history.pushState({ flip: 1 }, '', '/rear');
      flippedViaPush = true;
    }
    document.title = 'REAR PANEL — IB-01 · IVAN BASHKIROV';
  } else {
    u.classList.remove('flipped');
    // direct /rear loads pre-flip via body[data-mode='rear'] CSS — neutralize it
    if (mode() === 'rear') document.body.dataset.mode = 'activity';
    if (push) {
      if (flippedViaPush) {
        // we pushed /rear ourselves — going back restores the underlying URL
        flippedViaPush = false;
        history.back();
      } else {
        history.pushState({}, '', '/');
        if (hasPanels()) activate('activity', false);
        else document.title = 'IVAN BASHKIROV — IB-01 · SHIPPING LOG';
      }
    }
  }
}

export function initNav(): void {
  // rear affordances
  $('#rearLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    flip(true);
  });
  $('#rearClose')?.addEventListener('click', (e) => {
    e.preventDefault();
    flip(false);
  });

  // direct /rear load: state already flipped via CSS; sync history state
  if (mode() === 'rear') {
    history.replaceState({ flip: 1 }, '', '/rear');
    $('.face-front')?.setAttribute('inert', '');
  } else {
    $('#rearFace')?.setAttribute('inert', '');
  }

  window.addEventListener('popstate', () => {
    const m = modeFor(location.pathname);
    if (m === 'rear') {
      flip(true, false);
      return;
    }
    if (isFlipped()) flip(false, false);
    if (m && hasPanels()) activate(m, false);
  });

  // reduced motion: flip becomes an instant swap
  if (reduced()) unit()?.classList.add('no-anim');
}
