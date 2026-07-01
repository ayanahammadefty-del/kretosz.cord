/**
 * KRETOSCORD XE - Popup Extension Controller Interface Logic
 * Coordinates client-side visual display configurations and local data management profiles.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Tab Handling Architecture System
  const tabs = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".tab-view");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      views.forEach(v => v.classList.remove("active-view"));

      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active-view");
    });
  });

  // UI Component Interface Binding References
  const controls = {
    gateThreshold: { input: document.getElementById("sl-gate"), val: document.getElementById("val-gate"), unit: "dB" },
    eqLow: { input: document.getElementById("sl-eql"), val: document.getElementById("val-eql"), unit: "dB" },
    eqHigh: { input: document.getElementById("sl-eqh"), val: document.getElementById("val-eqh"), unit: "dB" },
    compThreshold: { input: document.getElementById("sl-comp"), val: document.getElementById("val-comp"), unit: "dB" }
  };

  function updateUISliders(config) {
    Object.keys(controls).forEach(key => {
      if (config[key] !== undefined) {
        controls[key].input.value = config[key];
        controls[key].val.innerText = `${config[key]} ${controls[key].unit}`;
      }
    });
  }

  // Read configuration snapshot state values from disk storage
  chrome.storage.local.get(["dsp_config"], (result) => {
    if (result.dsp_config) {
      updateUISliders(result.dsp_config);
      syncEngineParameters(result.dsp_config);
    }
  });

  // Attach event input listening loops across control nodes
  Object.keys(controls).forEach(key => {
    controls[key].input.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      controls[key].val.innerText = `${val} ${controls[key].unit}`;
      
      // Persist configuration update array metrics downstream
      chrome.storage.local.get(["dsp_config"], (result) => {
        const activeConf = result.dsp_config || {};
        activeConf[key] = val;
        chrome.storage.local.set({ dsp_config: activeConf }, () => {
          syncEngineParameters(activeConf);
        });
      });
    });
  });

  function syncEngineParameters(configData) {
    chrome.runtime.sendMessage({
      target: "page",
      action: "UPDATE_DSP",
      data: configData
    });
  }

  // Handle runtime telemetry packets back from active processing contexts
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TELEMETRY" && msg.data) {
      const data = msg.data;
      document.getElementById("meter-rms").style.width = `${data.rms}%`;
      // Normalize raw attenuation metric readings to display visually
      const grValue = Math.min(Math.abs(data.reduction) * 4, 100);
      document.getElementById("meter-gr").style.width = `${grValue}%`;

      document.getElementById("txt-latency").innerText = `${data.latency} ms`;
      document.getElementById("txt-state").innerText = data.state.toUpperCase();

      const tag = document.getElementById("engine-status");
      if (data.state === "running") {
        tag.innerText = "ACTIVE";
        tag.className = "status-tag status-online";
      } else {
        tag.innerText = "STANDBY";
        tag.className = "status-tag status-offline";
      }
    }
  });

  // Implement system button configuration mutations
  document.getElementById("btn-reset").addEventListener("click", () => {
    const defaultConf = { gateThreshold: -45, eqLow: 0, eqHigh: 0, compThreshold: -24 };
    chrome.storage.local.set({ dsp_config: defaultConf }, () => {
      updateUISliders(defaultConf);
      syncEngineParameters(defaultConf);
    });
  });

  document.getElementById("btn-save").addEventListener("click", () => {
    alert("Preset saved to Local Storage profile successfully.");
  });
});
