/* Signature sequence (§6): IDLE → PICKED → TRAVEL → INSERT → CHUNK → READING → DOC, and eject. */

import { $, isEink, reduced } from './util';
import * as sfx from './audio';

const INSERT_FLAG = 'ib01-inserted';
const EJECT_FLAG = 'ib01-eject';
const ORIGIN_FLAG = 'ib01-origin';
const LOG_ROUTES = ['/', '/projects', '/writing'];

let busy = false;
/** Source element hidden while its disk is in flight (restored on bfcache back). */
let hiddenSrc: HTMLElement | null = null;

/** How far the disk tips over while approaching the slot (near edge-on). */
const FLAT_DEG = 78;

const ss = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  del: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

function led(on: boolean): void {
  $('#driveLed')?.classList.toggle('on', on);
}

/** random 30–80ms LED flicker; returns stop() */
function ledFlicker(): () => void {
  let alive = true;
  let t: number;
  const step = () => {
    if (!alive) return;
    $('#driveLed')?.classList.toggle('on');
    t = window.setTimeout(step, 30 + Math.random() * 50);
  };
  step();
  return () => {
    alive = false;
    window.clearTimeout(t);
    led(false);
  };
}

function showReadout(text: string): void {
  const el = $('#readout');
  const txt = $('#readoutText');
  if (txt) txt.textContent = text;
  el?.classList.add('show');
}

function hideReadout(): void {
  $('#readout')?.classList.remove('show');
}

/** READING DISK…  TRK counter; returns stop() */
function trkCounter(): () => void {
  let trk = 0;
  const t = window.setInterval(() => {
    trk = Math.min(79, trk + 3 + Math.floor(Math.random() * 5));
    const txt = $('#readoutText');
    if (txt) txt.textContent = `READING DISK…  TRK ${String(trk).padStart(2, '0')}/79`;
  }, 28);
  return () => window.clearInterval(t);
}

function buildDisk(kind: string): HTMLElement {
  const d = document.createElement('span');
  d.className = 'disk';
  d.dataset.kind = kind;
  d.innerHTML = '<span class="label"></span>';
  return d;
}

interface FlyState {
  fly: HTMLElement;
  clone: HTMLElement;
  w: number;
  h: number;
}

function mountClone(src: HTMLElement | null, kind: string): FlyState {
  const fly = $('#flying-disk')!;
  fly.innerHTML = '';
  const isDiskEl = !!src?.classList.contains('disk');
  const clone = isDiskEl ? (src!.cloneNode(true) as HTMLElement) : buildDisk(kind);
  const w = isDiskEl ? src!.getBoundingClientRect().width : 150;
  clone.style.width = `${w}px`;
  clone.style.display = 'block';
  fly.appendChild(clone);
  fly.hidden = false;
  const h = clone.getBoundingClientRect().height || (w * 10) / 9;
  return { fly, clone, w, h };
}

const centerTransform = (st: FlyState, cx: number, cy: number, s: number) =>
  `translate(${cx - st.w / 2}px, ${cy - st.h / 2}px) scale(${s})`;

function cleanupFly(): void {
  const fly = $('#flying-disk');
  if (fly) {
    fly.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    fly.hidden = true;
    fly.innerHTML = '';
  }
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

async function animate(
  el: HTMLElement,
  frames: Keyframe[],
  opts: KeyframeAnimationOptions
): Promise<void> {
  try {
    await el.animate(frames, { fill: 'forwards', ...opts }).finished;
  } catch {
    /* cancelled */
  }
}

/* ---------------- load sequence ---------------- */

async function loadSequence(a: HTMLAnchorElement): Promise<void> {
  busy = true;
  const href = a.href;
  ss.set(ORIGIN_FLAG, location.pathname);

  const finishNav = () => {
    ss.set(INSERT_FLAG, '1');
    location.assign(href);
  };

  if (reduced()) {
    showReadout('READING DISK…');
    window.setTimeout(finishNav, 200);
    return;
  }

  let cancelled = false;
  const skip = () => {
    cancelled = true;
    offSkip();
    cleanupFly();
    finishNav();
  };
  const skipEvents = ['pointerdown', 'keydown'] as const;
  const offSkip = () =>
    skipEvents.forEach((e) => window.removeEventListener(e, skip, true));
  skipEvents.forEach((e) => window.addEventListener(e, skip, { capture: true }));

  sfx.click();

  const srcRect = a.getBoundingClientRect();
  const st = mountClone(a, a.dataset.kind ?? 'essay');
  const isDiskEl = a.classList.contains('disk');
  const s0 = isDiskEl ? 1 : 0.42;
  const cx0 = srcRect.left + srcRect.width / 2;
  const cy0 = srcRect.top + srcRect.height / 2;

  // the disk leaves the box — it is not copied
  if (isDiskEl) {
    hiddenSrc = a;
    a.style.visibility = 'hidden';
  }

  const slot = $('#driveSlot')!.getBoundingClientRect();
  const s1 = (slot.width * 0.86) / st.w;
  const cx1 = slot.left + slot.width / 2;
  // tipped nearly edge-on, the disk's visible half-height collapses by cos(FLAT_DEG)
  const flatHalf = ((st.h * s1) / 2) * Math.cos((FLAT_DEG * Math.PI) / 180);
  const cy1 = slot.top + 2 - flatHalf;

  st.fly.style.transform = centerTransform(st, cx0, cy0, s0);
  if (!isDiskEl) st.fly.style.opacity = '0';

  // PICKED — 120ms, lifted off the box
  await animate(st.fly, [
    { transform: centerTransform(st, cx0, cy0, s0), opacity: isDiskEl ? 1 : 0 },
    { transform: centerTransform(st, cx0, cy0 - 6, s0 * 1.04), opacity: 1 },
  ], { duration: 120, easing: 'ease-out' });
  if (cancelled) return;

  // TRAVEL — 480ms slight arc while tipping over to near edge-on
  const midY = Math.min(cy0, cy1) - 40;
  void animate(st.clone, [
    { transform: 'rotateX(0deg)' },
    { transform: 'rotateX(30deg)', offset: 0.45 },
    { transform: `rotateX(${FLAT_DEG}deg)` },
  ], { duration: 480, easing: 'cubic-bezier(.3,.7,.3,1)' });
  await animate(st.fly, [
    { transform: centerTransform(st, cx0, cy0 - 6, s0 * 1.04) },
    { transform: centerTransform(st, (cx0 + cx1) / 2, midY, (s0 + s1) / 2), offset: 0.5 },
    { transform: centerTransform(st, cx1, cy1, s1) },
  ], { duration: 480, easing: 'cubic-bezier(.3,.7,.3,1)' });
  if (cancelled) return;

  // INSERT — 200ms, the flattened disk is pushed into the slot mouth
  const drop = flatHalf * 2 + 4;
  void animate(st.clone, [
    { transform: `rotateX(${FLAT_DEG}deg)`, clipPath: 'inset(0 0 0% 0)' },
    { transform: `rotateX(${FLAT_DEG + 6}deg)`, clipPath: 'inset(0 0 88% 0)' },
  ], { duration: 200, easing: 'ease-in' });
  await animate(st.fly, [
    { transform: centerTransform(st, cx1, cy1, s1) },
    { transform: centerTransform(st, cx1, cy1 + drop, s1) },
  ], { duration: 200, easing: 'ease-in' });
  if (cancelled) return;

  // CHUNK — 80ms
  cleanupFly();
  const unit = $('#unit');
  unit?.classList.add('chunk');
  window.setTimeout(() => unit?.classList.remove('chunk'), 120);
  led(true);
  sfx.thunk();
  await wait(80);
  if (cancelled) return;

  // READING — 700ms
  showReadout('READING DISK…  TRK 00/79');
  const stopTrk = trkCounter();
  const stopFlicker = ledFlicker();
  const stopStepper = sfx.stepper();
  await wait(700);
  stopTrk();
  stopFlicker();
  stopStepper();
  if (cancelled) return;

  // MODESWITCH — 120ms LCD invert, then navigate
  led(true);
  $('#screen')?.classList.add('flash');
  await wait(110);
  if (cancelled) return;
  offSkip();
  finishNav();
}

/* ---------------- doc-page arrival ---------------- */

function arriveDoc(): void {
  const inserted = ss.get(INSERT_FLAG) === '1';
  ss.del(INSERT_FLAG);

  if (inserted) {
    // animation already played on the log page
    led(true);
    window.setTimeout(() => led(false), 500);
    return;
  }

  // direct visit: short version only (§6)
  if (reduced()) {
    showReadout('READING DISK…');
    window.setTimeout(hideReadout, 200);
    return;
  }
  showReadout('READING DISK…');
  const stopFlicker = ledFlicker();
  const done = () => {
    offSkip();
    stopFlicker();
    hideReadout();
  };
  const skipEvents = ['pointerdown', 'keydown'] as const;
  const skip = () => done();
  const offSkip = () =>
    skipEvents.forEach((e) => window.removeEventListener(e, skip, true));
  skipEvents.forEach((e) => window.addEventListener(e, skip, { capture: true }));
  window.setTimeout(done, 350);
}

/* ---------------- eject ---------------- */

export function ejectDoc(): void {
  if (!isEink() || busy) return;
  busy = true;
  const article = $('.doc');
  const slug = article?.dataset.slug ?? '';
  const origin = ss.get(ORIGIN_FLAG);
  const target = origin && LOG_ROUTES.includes(origin.replace(/\/+$/, '') || '/') ? origin : '/writing';

  const go = () => {
    if (slug) ss.set(EJECT_FLAG, slug);
    location.assign(target);
  };

  if (reduced()) {
    go();
    return;
  }
  sfx.eject();
  showReadout('EJECTING…');
  window.setTimeout(go, 250);
}

/** Disk pops out of the slot and flies home — runs on the log page after an eject. */
async function maybeEjectReturn(): Promise<void> {
  const slug = ss.get(EJECT_FLAG);
  if (!slug) return;
  ss.del(EJECT_FLAG);
  if (reduced()) return;

  const home = $(`a.disk[data-doc="${CSS.escape(slug)}"]`) as HTMLElement | null;
  const homeVisible = !!home && home.offsetParent !== null;
  const kind = home?.dataset.kind ?? 'essay';

  const st = mountClone(homeVisible ? home : null, kind);
  // the disk is coming home — its box slot stays empty until it lands
  if (homeVisible && home) home.style.visibility = 'hidden';
  const slot = $('#driveSlot')!.getBoundingClientRect();
  const s1 = (slot.width * 0.86) / st.w;
  const cx1 = slot.left + slot.width / 2;
  const flatHalf = ((st.h * s1) / 2) * Math.cos((FLAT_DEG * Math.PI) / 180);
  const cy1 = slot.top + 2 - flatHalf;
  const drop = flatHalf * 2 + 4;

  led(true);
  sfx.eject();
  st.clone.style.transform = `rotateX(${FLAT_DEG}deg)`;
  st.clone.style.clipPath = 'inset(0 0 88% 0)';
  st.fly.style.transform = centerTransform(st, cx1, cy1 + drop, s1);

  // pop out edge-on with overshoot spring
  void animate(st.clone, [
    { transform: `rotateX(${FLAT_DEG}deg)`, clipPath: 'inset(0 0 88% 0)' },
    { transform: `rotateX(${FLAT_DEG}deg)`, clipPath: 'inset(0 0 0% 0)' },
  ], { duration: 220, easing: 'ease-out' });
  await animate(st.fly, [
    { transform: centerTransform(st, cx1, cy1 + drop, s1) },
    { transform: centerTransform(st, cx1, cy1 - 10, s1), offset: 0.7 },
    { transform: centerTransform(st, cx1, cy1, s1) },
  ], { duration: 250, easing: 'ease-out' });
  led(false);

  if (homeVisible && home) {
    // fly home, unfolding from edge-on back to face-on
    const r = home.getBoundingClientRect();
    void animate(st.clone, [
      { transform: `rotateX(${FLAT_DEG}deg)` },
      { transform: 'rotateX(0deg)' },
    ], { duration: 400, easing: 'cubic-bezier(.3,.7,.3,1)' });
    await animate(st.fly, [
      { transform: centerTransform(st, cx1, cy1, s1), opacity: 1 },
      {
        transform: centerTransform(st, r.left + r.width / 2, r.top + r.height / 2, 1),
        opacity: 1,
      },
    ], { duration: 400, easing: 'cubic-bezier(.3,.7,.3,1)' });
    home.style.visibility = '';
  } else {
    await animate(st.fly, [
      { transform: centerTransform(st, cx1, cy1, s1), opacity: 1 },
      { transform: centerTransform(st, cx1, cy1 - 26, s1), opacity: 0 },
    ], { duration: 300, easing: 'ease-out' });
  }
  cleanupFly();
}

/* ---------------- init ---------------- */

export function initDisk(): void {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a[data-doc]') as HTMLAnchorElement | null;
    if (!a) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (busy) return;
    void loadSequence(a);
  });

  $('#eject')?.addEventListener('click', (e) => {
    e.preventDefault();
    ejectDoc();
  });

  if (isEink()) arriveDoc();
  else void maybeEjectReturn();

  // bfcache restore (browser Back mid-fiction): reset transient state, no flight (§6)
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    busy = false;
    cleanupFly();
    hideReadout();
    led(false);
    $('#screen')?.classList.remove('flash');
    if (hiddenSrc) {
      hiddenSrc.style.visibility = '';
      hiddenSrc = null;
    }
  });
}
