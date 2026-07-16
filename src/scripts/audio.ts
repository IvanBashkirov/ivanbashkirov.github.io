/* All UI sound is synthesized at runtime — no audio assets (§8.2). */

const KEY = 'ib01-snd';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;

try {
  enabled = localStorage.getItem(KEY) === '1';
} catch {
  /* private mode */
}

export const soundOn = (): boolean => enabled;

export function setSound(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (on) ac(); // resume within the user gesture
}

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function env(t0: number, peak: number, decay: number): GainNode {
  const c = ac();
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  g.connect(master!);
  return g;
}

let noiseBuf: AudioBuffer | null = null;

function noise(): AudioBufferSourceNode {
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  return src;
}

/** short mechanical click (button press) */
export function click(pitch = 1): void {
  if (!enabled) return;
  const c = ac();
  const t = c.currentTime;
  const n = noise();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3000 * pitch;
  const g = env(t, 0.5, 0.012);
  n.connect(hp).connect(g);
  n.start(t);
  n.stop(t + 0.02);
}

/** softer knob detent, +2st */
export function detent(): void {
  if (!enabled) return;
  const c = ac();
  const t = c.currentTime;
  const n = noise();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3800;
  const g = env(t, 0.3, 0.01);
  n.connect(hp).connect(g);
  n.start(t);
  n.stop(t + 0.015);
}

/** disk insert CHUNK: low thunk + mechanism click */
export function thunk(): void {
  if (!enabled) return;
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = 60;
  const g = env(t, 0.8, 0.08);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.1);
  setTimeout(() => click(0.7), 30);
}

/** eject: reverse thunk + spring */
export function eject(): void {
  if (!enabled) return;
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(50, t);
  o.frequency.linearRampToValueAtTime(95, t + 0.09);
  const g = env(t, 0.7, 0.1);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.12);
  // spring boing
  const s = c.createOscillator();
  s.type = 'triangle';
  s.frequency.setValueAtTime(420, t + 0.08);
  const lfo = c.createOscillator();
  lfo.frequency.value = 28;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 90;
  lfo.connect(lfoGain).connect(s.frequency);
  const sg = env(t + 0.08, 0.12, 0.18);
  s.connect(sg);
  lfo.start(t + 0.08);
  s.start(t + 0.08);
  s.stop(t + 0.3);
  lfo.stop(t + 0.3);
}

/** quiet stepper-motor chatter while the drive reads; returns stop() */
export function stepper(): () => void {
  if (!enabled) return () => {};
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = 110;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 4;
  const g = c.createGain();
  g.gain.value = 0.05;
  // gate the pulse train
  const gate = c.createOscillator();
  gate.type = 'square';
  gate.frequency.value = 22;
  const gateGain = c.createGain();
  gateGain.gain.value = 0.05;
  gate.connect(gateGain).connect(g.gain);
  o.connect(bp).connect(g).connect(master!);
  o.start(t);
  gate.start(t);
  const wobble = window.setInterval(() => {
    o.frequency.value = 90 + Math.random() * 60;
  }, 90);
  return () => {
    window.clearInterval(wobble);
    const now = c.currentTime;
    g.gain.setTargetAtTime(0.0001, now, 0.02);
    o.stop(now + 0.08);
    gate.stop(now + 0.08);
    click(0.8);
  };
}

/** drum pads (§8.3) */
export function pad(name: string): void {
  if (!enabled) return;
  const c = ac();
  const t = c.currentTime;
  switch (name) {
    case 'kck': {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      const g = env(t, 0.9, 0.12);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.14);
      break;
    }
    case 'snr': {
      const n = noise();
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 0.8;
      const g = env(t, 0.6, 0.1);
      n.connect(bp).connect(g);
      n.start(t);
      n.stop(t + 0.12);
      const body = c.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(185, t);
      const bg = env(t, 0.3, 0.06);
      body.connect(bg);
      body.start(t);
      body.stop(t + 0.08);
      break;
    }
    case 'hat': {
      const n = noise();
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 8000;
      const g = env(t, 0.35, 0.03);
      n.connect(hp).connect(g);
      n.start(t);
      n.stop(t + 0.04);
      break;
    }
    case 'cbl': {
      // the 808 cowbell recipe: two squares, 800 + 540 Hz
      const g = env(t, 0.35, 0.25);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1000;
      bp.Q.value = 1.2;
      bp.connect(g);
      for (const f of [800, 540]) {
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        o.connect(bp);
        o.start(t);
        o.stop(t + 0.26);
      }
      break;
    }
  }
}

/* ---- hidden-track placeholder: a synthesized 8-bar jig (§8.3) ---- */

const JIG_TEMPO = 0.16; // seconds per eighth in 6/8
// D dorian-ish jig, two 4-bar phrases, expressed as [semitone offset from D5, eighths]
const PHRASE: Array<[number, number]> = [
  [0, 1], [2, 1], [3, 1], [5, 1], [3, 1], [2, 1],
  [0, 1], [2, 1], [3, 1], [7, 2], [5, 1],
  [3, 1], [5, 1], [7, 1], [8, 1], [7, 1], [5, 1],
  [7, 2], [3, 2], [0, 2],
  [0, 1], [2, 1], [3, 1], [5, 1], [3, 1], [2, 1],
  [0, 1], [2, 1], [3, 1], [7, 2], [5, 1],
  [3, 1], [5, 1], [7, 1], [5, 1], [3, 1], [2, 1],
  [0, 4], [-2, 2],
];

export interface JigHandle {
  stop: () => void;
  duration: number;
}

/** Play the placeholder tune. Not gated by the SND switch — starting the tape is explicit playback. */
export function playJig(loop = true): JigHandle {
  const c = ac();
  const g = c.createGain();
  g.gain.value = 0.22;
  g.connect(c.destination); // bypass master so SND-off users still hear the tape they pressed PLAY on
  const vib = c.createOscillator();
  vib.frequency.value = 5.4;
  const vibG = c.createGain();
  vibG.gain.value = 4;
  vib.connect(vibG);
  vib.start();

  const oscs: OscillatorNode[] = [];
  const D5 = 587.33;
  let stopped = false;
  let loopTimer: number | undefined;

  const schedule = (start: number) => {
    let t = start;
    for (const [semi, len] of PHRASE) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = D5 * Math.pow(2, semi / 12);
      vibG.connect(o.frequency);
      const ng = c.createGain();
      const dur = len * JIG_TEMPO;
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.linearRampToValueAtTime(1, t + 0.02);
      ng.gain.setValueAtTime(1, t + dur - 0.04);
      ng.gain.linearRampToValueAtTime(0.0001, t + dur - 0.005);
      o.connect(ng).connect(g);
      o.start(t);
      o.stop(t + dur);
      oscs.push(o);
      t += dur;
    }
    return t - start;
  };

  const total = PHRASE.reduce((s, [, l]) => s + l, 0) * JIG_TEMPO;
  const kickoff = (at: number) => {
    if (stopped) return;
    schedule(at);
    if (loop) loopTimer = window.setTimeout(() => kickoff(c.currentTime + 0.05), total * 1000 - 100);
  };
  kickoff(c.currentTime + 0.06);

  return {
    duration: total,
    stop: () => {
      stopped = true;
      window.clearTimeout(loopTimer);
      const now = c.currentTime;
      g.gain.setTargetAtTime(0.0001, now, 0.03);
      for (const o of oscs) {
        try {
          o.stop(now + 0.1);
        } catch {
          /* already stopped */
        }
      }
      vib.stop(now + 0.1);
    },
  };
}
