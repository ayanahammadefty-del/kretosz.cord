/**
 * KRETOSCORD XE - Background Service Worker
 * Coordinates state and message passing between Popup UI and Injected DOM Core
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[KRETOSCORD XE] Background Service Worker Initialized.");
});

// Relay messages from Popup UI to active Discord tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "page") {
    chrome.tabs.query({ url: "https://*.discord.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, message);
      });
    });
    sendResponse({ status: "relayed" });
  } else if (message.target === "popup") {
    // Broadcast engine telemetry back to popup if open
    chrome.runtime.sendMessage(message);
    sendResponse({ status: "broadcasted" });
  }
  return true;
});
