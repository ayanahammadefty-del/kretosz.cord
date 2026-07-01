{
  "manifest_version": 3,
  "name": "KRETOSCORD XE Ultimate Mobile Audio Engine",
  "version": "1.0.0",
  "description": "Professional-grade Web Audio API DSP engine for Discord Web on Mobile Chromium.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.discord.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*.discord.com/*"],
      "js": ["content.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["inject.js", "voice.js", "voice-boost.js"],
      "matches": ["https://*.discord.com/*"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon16.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  }
    }
