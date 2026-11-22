import { WeatherTelemetry } from '../types/game';

/**
 * 100% procedural Web Audio soundscape for ocean waves, storm wind, rain,
 * radar observation pings, and hull danger alarms (zero external audio files).
 */
export class MaritimeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private muted = false;
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.45;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Create 3-second seamless noise buffer
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brownish/pink ocean rumble noise
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 3.2;
    }

    // Wind + Ocean wave rumble layer
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 260;
    windFilter.Q.value = 1.4;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.14;

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();

    this.windFilter = windFilter;
    this.windGain = windGain;

    // Rain hiss layer (white noise high-pass)
    const rainBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const rainData = rainBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      rainData[i] = Math.random() * 2 - 1;
    }

    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuffer;
    rainSrc.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 2600;
    rainFilter.Q.value = 0.7;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;

    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();

    this.rainGain = rainGain;
    this.initialized = true;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.45,
        this.ctx.currentTime,
        0.08,
      );
    }
  }

  public updateTelemetry(t: WeatherTelemetry): void {
    if (!this.initialized || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (this.windGain && this.windFilter) {
      const windNorm = Math.min(1, t.windKnots / 135);
      this.windGain.gain.setTargetAtTime(0.08 + windNorm * 0.42, now, 0.25);
      this.windFilter.frequency.setTargetAtTime(
        220 + windNorm * 950,
        now,
        0.25,
      );
    }

    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(
        t.rainIntensity * 0.11,
        now,
        0.25,
      );
    }
  }

  public playRadarPing(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted)
      return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playThunder(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted)
      return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 1.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.3);
  }

  public playAnswerFeedback(correct: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted)
      return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = correct ? 'triangle' : 'sawtooth';

    if (correct) {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.09);
    } else {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.28);
    }

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
