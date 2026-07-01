/**
 * KRETOSCORD XE - Core Structural Context Interceptor Hook Injection
 * Monkey patches mediaDevices and AudioContext globally to route streams through the engine.
 */

(function () {
  console.log("[KRETOSCORD XE] Core Execution Layer Hooked.");

  let sharedAudioCtx = null;
  let dspEngine = null;
  let playbackEngine = null;

  function initEngines() {
    if (!sharedAudioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      sharedAudioCtx = new AudioCtxClass({
        latencyHint: "interactive",
        sampleRate: 48000 // Force standard high quality processing sample rate
      });
    }
    if (!dspEngine) dspEngine = new window.KretoscordDSP(sharedAudioCtx);
    if (!playbackEngine) playbackEngine = new window.KretoscordPlaybackEngine(sharedAudioCtx);
  }

  // Intercept Media Capture Layer API calls
  const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async function (constraints) {
    if (constraints && constraints.audio) {
      console.log("[KRETOSCORD XE] Intercepting Discord Audio Stream Request...");
      initEngines();
      
      // Forces raw stream profile optimization capture
      if (typeof constraints.audio === "boolean") constraints.audio = {};
      constraints.audio.echoCancellation = true;
      constraints.audio.noiseSuppression = false; // Bypass low fidelity processing loops
      constraints.audio.autoGainControl = false;

      const rawStream = await nativeGetUserMedia(constraints);
      const mediaSourceNode = sharedAudioCtx.createMediaStreamSource(rawStream);
      
      // Process raw audio via our advanced DSP chain matrix
      const processedStream = dspEngine.buildMicrophonePipeline(mediaSourceNode);
      return processedStream;
    }
    return nativeGetUserMedia(constraints);
  };

  // Listen for control system mutations from the Extension Front-End interface
  window.addEventListener("KRETOSCORD_CONTROL", (e) => {
    if (e.detail && e.detail.action === "UPDATE_DSP") {
      if (dspEngine) dspEngine.updateConfig(e.detail.data);
    }
  });

  // Track HTML DOM Video/Audio Node elements for late output binding enhancements
  setInterval(() => {
    if (!playbackEngine) return;
    const items = document.querySelectorAll("audio, video");
    items.forEach(el => playbackEngine.processElementNode(el));
  }, 2500);
})();
