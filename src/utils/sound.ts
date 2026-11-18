class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.12,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playSelect() {
    this.playTone(540, 0.07, 'triangle', 0.08, 0, 660);
  }

  public playSwap() {
    this.playTone(340, 0.09, 'sine', 0.09, 0, 480);
  }

  public playInvalid() {
    this.playTone(210, 0.14, 'sawtooth', 0.06, 0, 140);
    this.playTone(170, 0.14, 'sawtooth', 0.05, 0.08, 120);
  }

  public playMatch(comboStep: number) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const idx = Math.min(Math.max(0, comboStep - 1), scale.length - 1);
    const root = scale[idx];
    this.playTone(root, 0.22, 'triangle', 0.12, 0);
    this.playTone(root * 1.5, 0.18, 'sine', 0.07, 0.035);
  }

  public playCollectPing() {
    this.playTone(1046.5, 0.12, 'sine', 0.07, 0, 1318.5);
  }

  public playPowerCreate() {
    this.playTone(660, 0.14, 'triangle', 0.12, 0, 880);
    this.playTone(987.77, 0.24, 'sine', 0.12, 0.07, 1318.5);
  }

  public playRocket() {
    this.playTone(900, 0.24, 'sawtooth', 0.08, 0, 220);
    this.playTone(520, 0.2, 'triangle', 0.1, 0.02, 1100);
  }

  public playBomb() {
    this.playTone(150, 0.36, 'triangle', 0.2, 0, 42);
    this.playTone(95, 0.3, 'sine', 0.18, 0.02, 34);
  }

  public playPlane() {
    this.playTone(440, 0.22, 'sine', 0.09, 0, 740);
    this.playTone(620, 0.22, 'triangle', 0.08, 0.1, 880);
  }

  public playRainbow() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((n, i) => {
      this.playTone(n, 0.2, 'sine', 0.09, i * 0.045);
    });
  }

  public playObstacleHit() {
    this.playTone(260, 0.09, 'square', 0.05, 0, 140);
  }

  public playFirework(index = 0) {
    const base = 440 + (index % 5) * 90;
    this.playTone(base, 0.14, 'sine', 0.09, 0, base * 1.8);
    this.playTone(180, 0.22, 'triangle', 0.11, 0.09, 65);
    this.playTone(base * 2, 0.16, 'sine', 0.07, 0.11);
  }

  public playStarDing(starNumber: number) {
    const freqs = [659.25, 783.99, 1046.5];
    const f = freqs[Math.min(2, Math.max(0, starNumber - 1))];
    this.playTone(f, 0.28, 'triangle', 0.14, 0);
    this.playTone(f * 1.5, 0.22, 'sine', 0.08, 0.04);
  }

  public playWin() {
    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.11, 0.22, 0.34, 0.5, 0.64];
    melody.forEach((freq, i) => {
      this.playTone(freq, i === melody.length - 1 ? 0.5 : 0.18, 'triangle', 0.13, times[i]);
    });
  }

  public playLose() {
    this.playTone(392, 0.22, 'triangle', 0.1, 0, 349.23);
    this.playTone(349.23, 0.25, 'triangle', 0.1, 0.2, 293.66);
    this.playTone(261.63, 0.42, 'sine', 0.11, 0.42, 220);
  }

  public playRenovate() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((n, i) => {
      this.playTone(n, 0.32, 'triangle', 0.1, i * 0.06);
    });
  }
}

export const sound = new SoundManager();
