// A plucked triad from three oscillators. Web Audio only; nothing here touches `window` until it is called.

/** Open low E (E2). Pitches elsewhere in the app are semitones above it. */
const LOW_E_HZ = 82.41;
const STRUM = 0.035;   // seconds between strings, low to high
const ATTACK = 0.008;
const DECAY = 1.1;
const LEVEL = 0.22;    // per note, so three of them stay well under full scale
const FADE = 0.04;     // how fast a ringing chord gets out of the next one's way
const IDLE_MS = 4000;  // suspend the context this long after the last sound

type Voice = { gain: GainNode; oscs: OscillatorNode[] };

let ctx: AudioContext | null = null;
let ringing: Voice[] = [];
let idle: ReturnType<typeof setTimeout> | undefined;
let pending: ReturnType<typeof setTimeout> | undefined;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/**
 * Run `play` once the context is running. Browsers keep a context suspended until the page has
 * seen a click, and answer `resume()` only then — so a chord asked for by an early hover is
 * dropped rather than left to sound, stale, at the first click.
 */
function whenRunning(ac: AudioContext, play: () => void) {
  if (ac.state === "running") { play(); return; }
  const asked = Date.now();
  void ac.resume().then(() => { if (Date.now() - asked < 400) play(); }).catch(() => {});
}

function hush(ac: AudioContext) {
  const now = ac.currentTime;
  for (const v of ringing) {
    try {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setTargetAtTime(0, now, FADE / 3);
      for (const o of v.oscs) o.stop(now + FADE * 4);
    } catch {
      // already stopped
    }
  }
  ringing = [];
}

function strum(ac: AudioContext, notes: number[], at: number) {
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  filter.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(1, at);
  const oscs = [...notes].sort((a, b) => a - b).map((p, i) => {
    const t = at + i * STRUM;
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = LOW_E_HZ * 2 ** (p / 12);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(LEVEL, t + ATTACK);
    env.gain.exponentialRampToValueAtTime(0.0001, t + DECAY);
    osc.connect(env);
    env.connect(filter);
    osc.start(t);
    osc.stop(t + DECAY + 0.05);
    return osc;
  });
  ringing.push({ gain, oscs });
}

function rest() {
  clearTimeout(idle);
  idle = setTimeout(() => { void ctx?.suspend().catch(() => {}); }, IDLE_MS);
}

/** Play one chord (pitches in semitones above the low E), cutting off whatever was still ringing. */
export function playChord(notes: number[]): void {
  try {
    const ac = context();
    if (!ac) return;
    clearTimeout(pending);
    whenRunning(ac, () => {
      hush(ac);
      strum(ac, notes, ac.currentTime + 0.01);
      rest();
    });
  } catch {
    // no audio device, blocked context: the picker works without sound
  }
}

/** Play `first`, then `second` once it has had a moment to be heard. */
export function playPair(first: number[], second: number[]): void {
  playChord(first);
  pending = setTimeout(() => playChord(second), 600);
}

/** Stop everything now (the picker closed). The context is kept for next time and suspends on its own. */
export function stopAudio(): void {
  try {
    clearTimeout(pending);
    if (ctx) hush(ctx);
  } catch {
    // nothing to stop
  }
}
