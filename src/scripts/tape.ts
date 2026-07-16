/* Tape-transport player for the hidden track (§8.3). */

import { $ } from './util';
import { playJig, type JigHandle } from './audio';

export function initTape(): void {
  const tape = $('#tape');
  if (!tape) return;
  const playBtn = $('#tapePlay');
  const stopBtn = $('#tapeStop');
  const counter = $('#tapeCounter');

  let jig: JigHandle | null = null;
  let audioEl: HTMLAudioElement | null = null;
  let audioOk: boolean | null = null;
  let counterTimer: number | undefined;
  let count = 0;

  // owner may supply /audio/hidden-track.mp3; otherwise the synthesized jig plays
  const probe = new Audio();
  probe.preload = 'metadata';
  probe.src = '/audio/hidden-track.mp3';
  probe.addEventListener('canplaythrough', () => {
    audioOk = true;
    audioEl = probe;
  });
  probe.addEventListener('error', () => (audioOk = false));

  const startCounter = () => {
    counterTimer = window.setInterval(() => {
      count = (count + 1) % 1000;
      if (counter) counter.textContent = String(count).padStart(3, '0');
    }, 200);
  };

  const stop = () => {
    jig?.stop();
    jig = null;
    audioEl?.pause();
    window.clearInterval(counterTimer);
    tape.classList.remove('playing');
    playBtn?.setAttribute('aria-pressed', 'false');
  };

  playBtn?.addEventListener('click', () => {
    if (tape.classList.contains('playing')) return;
    tape.classList.add('playing');
    playBtn.setAttribute('aria-pressed', 'true');
    if (audioOk && audioEl) {
      audioEl.currentTime = 0;
      audioEl.loop = true;
      void audioEl.play();
    } else {
      jig = playJig(true);
    }
    startCounter();
  });

  stopBtn?.addEventListener('click', stop);
  window.addEventListener('pagehide', stop);
}
