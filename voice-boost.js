/**
 * KRETOSCORD XE - Downstream Playback Processing Engine
 * Protects speaker coils from square-wave clipping while maximizing output clarity.
 */

class KretoscordPlaybackEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.nodes = new Map();
  }

  processElementNode(htmlAudioElement) {
    if (this.nodes.has(htmlAudioElement)) return;

    try {
      const source = this.ctx.createMediaElementSource(htmlAudioElement);
      
      const eqLow = this.ctx.createBiquadFilter();
      eqLow.type = "lowshelf";
      eqLow.frequency.value = 200;
      eqLow.gain.value = 2.0; // Clean bottom warm vocal boost

      const eqHigh = this.ctx.createBiquadFilter();
      eqHigh.type = "highshelf";
      eqHigh.frequency.value = 5000;
      eqHigh.gain.value = 1.5; // Accentuate consonants for intelligibility

      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -1.5;
      limiter.ratio.value = 18;

      // Pipeline attachment
      source.connect(eqLow);
      eqLow.connect(eqHigh);
      eqHigh.connect(limiter);
      limiter.connect(this.ctx.destination);

      this.nodes.set(htmlAudioElement, { source, eqLow, eqHigh, limiter });
    } catch (e) {
      console.warn("[KRETOSCORD XE] Could not capture media element node. Possibly already captured.", e);
    }
  }
}

window.KretoscordPlaybackEngine = KretoscordPlaybackEngine;
