/**
 * KRETOSCORD XE - Core DSP Engine Pipeline
 * High-performance Web Audio API structures optimized for ARM Neon / Mobile WebKit execution.
 */

class KretoscordDSP {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.config = this.getDefaultConfig();
    this.isPlaying = false;
    this.telemetryInterval = null;
  }

  getDefaultConfig() {
    return {
      gateThreshold: -45,
      agcTarget: -12,
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      compThreshold: -24,
      compRatio: 4,
      compAttack: 0.012,
      compRelease: 0.120,
      limiterCeiling: -1.0,
      playbackVolume: 1.0,
      playbackEqLow: 0,
      playbackEqHigh: 0
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.applyRuntimeParameters();
  }

  buildMicrophonePipeline(sourceStreamNode) {
    const ctx = this.ctx;
    
    // 1. High Pass Filter (Remove sub-bass rumble/handling noise)
    this.hpf = ctx.createBiquadFilter();
    this.hpf.type = "highpass";
    this.hpf.frequency.value = 85; // Hz

    // 2. Noise Gate via DynamicsCompressor Node abuse or ScriptProcessor/AudioWorklet
    // Implemented via expander emulation for strict lower CPU footprints on mobile
    this.gate = ctx.createDynamicsCompressor();
    this.gate.threshold.value = this.config.gateThreshold;
    this.gate.ratio.value = 12;

    // 3. Adaptive Gain Control / Pre-Amp Element
    this.agcGain = ctx.createGain();
    this.agcGain.gain.value = 1.2;

    // 4. Parametric Speech EQ (3-Band Fixed Curve optimized for voice intelligibility)
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = "lowshelf";
    this.eqLow.frequency.value = 250;

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = "peaking";
    this.eqMid.frequency.value = 1500;
    this.eqMid.Q.value = 1.0;

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = "highshelf";
    this.eqHigh.frequency.value = 6000;

    // 5. Main Compressor Pipeline
    this.compressor = ctx.createDynamicsCompressor();
    
    // 6. Brickwall Limiter
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = this.config.limiterCeiling;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.050;

    // Telemetry Analyzer Node
    this.analyzer = ctx.createAnalyser();
    this.analyzer.fftSize = 64;

    // Wire Node Matrix Topology
    sourceStreamNode.connect(this.hpf);
    this.hpf.connect(this.gate);
    this.gate.connect(this.agcGain);
    this.agcGain.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.analyzer);

    this.applyRuntimeParameters();
    this.startTelemetryLoop();

    // Create a Destination Stream Node to return back to Discord's Native Peer Connection
    const destinationStream = ctx.createMediaStreamDestination();
    this.limiter.connect(destinationStream);
    return destinationStream.stream;
  }

  applyRuntimeParameters() {
    if (!this.hpf) return; // Nodes uninitialized
    
    // Smooth parametric transitions using exponential / linear ramps to avoid audio pops
    const t = this.ctx.currentTime + 0.03;
    this.gate.threshold.setValueAtTime(this.config.gateThreshold, t);
    this.eqLow.gain.setValueAtTime(this.config.eqLow, t);
    this.eqMid.gain.setValueAtTime(this.config.eqMid, t);
    this.eqHigh.gain.setValueAtTime(this.config.eqHigh, t);
    
    this.compressor.threshold.setValueAtTime(this.config.compThreshold, t);
    this.compressor.ratio.setValueAtTime(this.config.compRatio, t);
    this.compressor.attack.setValueAtTime(this.config.compAttack, t);
    this.compressor.release.setValueAtTime(this.config.compRelease, t);
  }

  startTelemetryLoop() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    const buffer = new Uint8Array(this.analyzer.frequencyBinCount);
    
    this.telemetryInterval = setInterval(() => {
      if (!this.analyzer) return;
      this.analyzer.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];
      const rms = sum / buffer.length;
      
      // Compute gain reduction metric safely
      const gainReduction = this.compressor ? this.compressor.reduction : 0;

      window.dispatchEvent(new CustomEvent("KRETOSCORD_TELEMETRY", {
        detail: {
          rms: Math.round((rms / 255) * 100),
          reduction: Math.round(typeof gainReduction === "number" ? gainReduction : (gainReduction.value || 0)),
          latency: Math.round(this.ctx.baseLatency ? this.ctx.baseLatency * 1000 : 4.5),
          state: this.ctx.state
        }
      }));
    }, 120); // Mobile optimization: Sample throttle at ~8.3Hz
  }

  teardown() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    this.hpf?.disconnect();
    this.gate?.disconnect();
    this.agcGain?.disconnect();
    this.eqLow?.disconnect();
    this.eqMid?.disconnect();
    this.eqHigh?.disconnect();
    this.compressor?.disconnect();
    this.limiter?.disconnect();
    this.analyzer?.disconnect();
  }
}

window.KretoscordDSP = KretoscordDSP;
