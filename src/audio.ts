// Web Audio API pure implementation for sound therapy & healing frequencies

let audioContext: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeGainNodes: GainNode[] = [];
let noiseNode: AudioBufferSourceNode | null = null;

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function playBinauralBeats(baseFreq: number = 200, beatFreq: number = 7, volume: number = 0.5) {
  stopAudio();
  const ctx = getContext();

  const leftOsc = ctx.createOscillator();
  const rightOsc = ctx.createOscillator();
  const leftGain = ctx.createGain();
  const rightGain = ctx.createGain();
  const merger = ctx.createChannelMerger(2);

  leftOsc.frequency.value = baseFreq;
  rightOsc.frequency.value = baseFreq + beatFreq;

  leftGain.gain.value = volume;
  rightGain.gain.value = volume;

  leftOsc.connect(leftGain);
  rightOsc.connect(rightGain);

  leftGain.connect(merger, 0, 0); // connect to left channel
  rightGain.connect(merger, 0, 1); // connect to right channel

  merger.connect(ctx.destination);

  leftOsc.start();
  rightOsc.start();

  activeOscillators.push(leftOsc, rightOsc);
  activeGainNodes.push(leftGain, rightGain);
}

export function playPureTone(frequency: number = 432, volume: number = 0.3) {
  stopAudio();
  const ctx = getContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();

  activeOscillators.push(osc);
  activeGainNodes.push(gain);
}

export function playRainNoise(volume: number = 0.2) {
  stopAudio();
  const ctx = getContext();

  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // Generate Brownian/Pink-ish noise for natural rain/water sound
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11; // scaling
    b6 = white * 0.115926;
  }

  noiseNode = ctx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  // Add low-pass filter to sound more like gentle distant rain/waves
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;

  noiseNode.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noiseNode.start();
  activeGainNodes.push(gain);
}

export function playTimerCompletionSound() {
  const ctx = getContext();
  const now = ctx.currentTime;

  // Soft harmonious dual chime (Perfect 5th interval)
  [523.25, 783.99].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.type = 'sine';

    // Fade out elegantly
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2 + idx * 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.15);
    osc.stop(now + 3);
  });
}

export function stopAudio() {
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  if (noiseNode) {
    try { noiseNode.stop(); } catch (e) {}
  }
  activeOscillators = [];
  activeGainNodes = [];
  noiseNode = null;
}
