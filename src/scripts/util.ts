export const $ = <T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document
): T | null => root.querySelector<T>(sel);

export const $$ = <T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document
): T[] => Array.from(root.querySelectorAll<T>(sel));

export const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const mode = (): string => document.body.dataset.mode ?? '';

export const isLogPage = (): boolean =>
  ['activity', 'projects', 'writing', 'rear'].includes(mode());

export const isEink = (): boolean => document.body.hasAttribute('data-eink');

let flashTimer: number | undefined;

/** Flash a message in the LCD status bar (no-op on doc pages). */
export function statusFlash(text: string, ms = 2500): void {
  const el = $('#statusFlash');
  if (!el) return;
  el.textContent = text;
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => (el.textContent = ''), ms);
}

const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Fire once on any user input; returns a cancel function. */
export function onAnyInput(handler: () => void): () => void {
  const wrapped = () => {
    cancel();
    handler();
  };
  const cancel = () => INPUT_EVENTS.forEach((e) => window.removeEventListener(e, wrapped, true));
  INPUT_EVENTS.forEach((e) => window.addEventListener(e, wrapped, { capture: true, passive: true }));
  return cancel;
}

/** True when the event originates in a text-entry context. */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));
