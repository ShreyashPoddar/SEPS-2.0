// Web Audio API Sound Synthesizer for Ribbon Cutting Ceremony

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a crisp scissor snip sound effect
 */
export function playSnipSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // High frequency noise burst for scissor blades slide & cut
    const bufferSize = ctx.sampleRate * 0.12; // 120ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(8000, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.12);

    // Add a metallic click/snip tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

/**
 * Play a grand fanfare chime chord when ribbon is cut
 */
export function playFanfareSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.1;
    // Major triad chord progression (C5, E5, G5, C6, G6)
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1567.98];

    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.06);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.2, now + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8 + index * 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.06);
      osc.stop(now + 2.0);
    });
  } catch (e) {
    console.warn("Fanfare audio play failed:", e);
  }
}
