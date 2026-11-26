// Lightweight Web Audio API documentary soundscape with era mood & automatic voice ducking

const STORAGE_KEY = 'world-history-atlas:ambient-bgm:v1';

interface EraPalette {
  notesHz: number[];
  waveform: OscillatorType;
  filterHz: number;
  intervalMs: number;
}

const ERA_PALETTES: Record<string, EraPalette> = {
  // Pentatonic warm bronze-age drone & chime
  'era-1': { notesHz: [146.83, 220.0, 293.66, 329.63, 440.0], waveform: 'sine', filterHz: 780, intervalMs: 3200 },
  // Classical fifths & open lyre
  'era-2': { notesHz: [130.81, 196.0, 261.63, 329.63, 392.0], waveform: 'triangle', filterHz: 860, intervalMs: 3000 },
  // Silk road Dorian contemplative pad
  'era-3': { notesHz: [146.83, 220.0, 261.63, 329.63, 392.0], waveform: 'sine', filterHz: 920, intervalMs: 2800 },
  // Steppe horizon & maritime spice open fifths
  'era-4': { notesHz: [164.81, 246.94, 329.63, 392.0, 493.88], waveform: 'triangle', filterHz: 960, intervalMs: 2600 },
  // Oceanic horizon minor-major swells
  'era-5': { notesHz: [130.81, 196.0, 233.08, 293.66, 392.0], waveform: 'sine', filterHz: 880, intervalMs: 2500 },
  // Industrial brass/cello low harmonic
  'era-6': { notesHz: [110.0, 164.81, 220.0, 261.63, 329.63], waveform: 'triangle', filterHz: 740, intervalMs: 2400 },
  // Twentieth-century solemn amber chord
  'era-7': { notesHz: [110.0, 146.83, 196.0, 246.94, 293.66], waveform: 'sine', filterHz: 700, intervalMs: 2700 },
  // Contemporary glassy harmonic synth
  'era-8': { notesHz: [164.81, 220.0, 293.66, 369.99, 440.0], waveform: 'sine', filterHz: 1150, intervalMs: 2500 },
};

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lowpassFilter: BiquadFilterNode | null = null;
let noteTimerId: number | null = null;
let droneOscA: OscillatorNode | null = null;
let droneOscB: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let enabledState = false;
let duckedState = false;
let currentEraId = 'era-5';
let noteCursor = 0;

try {
  enabledState = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  enabledState = false;
}

const NORMAL_GAIN = 0.13;
const DUCKED_GAIN = 0.028;

function ensureEngine(): boolean {
  if (typeof window === 'undefined') return false;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  if (!audioCtx) {
    audioCtx = new Ctor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.0001;

    lowpassFilter = audioCtx.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 900;
    lowpassFilter.Q.value = 0.6;

    lowpassFilter.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return true;
}

function updateMasterTargetGain() {
  if (!audioCtx || !masterGain) return;
  const now = audioCtx.currentTime;
  const target = !enabledState ? 0.0001 : duckedState ? DUCKED_GAIN : NORMAL_GAIN;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(target, now + (duckedState ? 0.28 : 0.65));
}

function startDroneAndChimes() {
  if (!audioCtx || !lowpassFilter) return;
  const palette = ERA_PALETTES[currentEraId] || ERA_PALETTES['era-5'];
  lowpassFilter.frequency.setTargetAtTime(palette.filterHz, audioCtx.currentTime, 0.5);

  if (!droneOscA || !droneOscB || !droneGain) {
    droneGain = audioCtx.createGain();
    droneGain.gain.value = 0.36;
    droneGain.connect(lowpassFilter);

    droneOscA = audioCtx.createOscillator();
    droneOscA.type = 'sine';
    droneOscA.frequency.value = palette.notesHz[0];

    droneOscB = audioCtx.createOscillator();
    droneOscB.type = 'sine';
    droneOscB.frequency.value = palette.notesHz[1];

    droneOscA.connect(droneGain);
    droneOscB.connect(droneGain);
    droneOscA.start();
    droneOscB.start();
  } else {
    droneOscA.frequency.setTargetAtTime(palette.notesHz[0], audioCtx.currentTime, 0.8);
    droneOscB.frequency.setTargetAtTime(palette.notesHz[1], audioCtx.currentTime, 0.8);
  }

  if (noteTimerId !== null) {
    window.clearInterval(noteTimerId);
    noteTimerId = null;
  }

  const spawnChime = () => {
    if (!enabledState || !audioCtx || !lowpassFilter || audioCtx.state !== 'running') return;
    const pal = ERA_PALETTES[currentEraId] || ERA_PALETTES['era-5'];
    const hz = pal.notesHz[2 + (noteCursor % Math.max(1, pal.notesHz.length - 2))];
    noteCursor += 1;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = pal.waveform;
    osc.frequency.setValueAtTime(hz, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

    osc.connect(env);
    env.connect(lowpassFilter);
    osc.start(now);
    osc.stop(now + 3.35);
  };

  spawnChime();
  noteTimerId = window.setInterval(spawnChime, palette.intervalMs);
}

function stopLoopOnly() {
  if (noteTimerId !== null) {
    window.clearInterval(noteTimerId);
    noteTimerId = null;
  }
}

export function isAmbientEnabled(): boolean {
  return enabledState;
}

export function setAmbientEnabled(next: boolean): void {
  enabledState = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    // Ignore
  }

  if (next) {
    if (!ensureEngine()) return;
    startDroneAndChimes();
    updateMasterTargetGain();
  } else {
    stopLoopOnly();
    updateMasterTargetGain();
  }
}

export function setAmbientEra(eraId: string): void {
  if (currentEraId === eraId) return;
  currentEraId = eraId;
  if (enabledState && audioCtx) {
    startDroneAndChimes();
  }
}

export function setAmbientVoiceDucking(ducked: boolean): void {
  if (duckedState === ducked) return;
  duckedState = ducked;
  if (audioCtx && masterGain) {
    updateMasterTargetGain();
  }
}
