/* SOUND switch (§8.2): opt-in, persisted, orange dot when ON. */

import { $, statusFlash } from './util';
import * as sfx from './audio';

function render(on: boolean): void {
  $('#snd')?.setAttribute('aria-checked', on ? 'true' : 'false');
}

export function toggleSound(): void {
  const on = !sfx.soundOn();
  sfx.setSound(on);
  render(on);
  if (on) sfx.click();
  statusFlash(`SND: ${on ? 'ON' : 'OFF'}`);
}

export function initSnd(): void {
  render(sfx.soundOn());
  $('#snd')?.addEventListener('click', toggleSound);
}
