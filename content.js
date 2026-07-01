/**
 * KRETOSCORD XE - Content Script
 * Breaks out of the extension sandbox to inject scripts directly into page context
 */

function injectScript(file) {
  try {
    const container = document.head || document.documentElement;
    const script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", chrome.runtime.getURL(file));
    container.insertBefore(script, container.firstChild);
    script.onload = () => script.remove();
  } catch (e) {
    console.error("[KRETOSCORD XE] Injection failed for: " + file, e);
  }
}

// Inject execution layers sequentially
injectScript("voice.js");
injectScript("voice-boost.js");
injectScript("inject.js");

// Set up relay bridge for communication between Popup Extension UI and Injected Context
window.addEventListener("KRETOSCORD_TELEMETRY", (event) => {
  chrome.runtime.sendMessage({ target: "popup", type: "TELEMETRY", data: event.detail });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.target === "page_core") {
    window.dispatchEvent(new CustomEvent("KRETOSCORD_CONTROL", { detail: message }));
  }
});
