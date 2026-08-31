// storage.js — chrome.storage.local wrappers with TTL support
(() => {
  const ns = (window.__YLS = window.__YLS || {});

  function assertAvailable() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      throw new Error(
        "Extension context unavailable. Reload the extension at chrome://extensions, then hard-reload this tab (Cmd+Shift+R)."
      );
    }
  }

  async function get(key) {
    assertAvailable();
    const res = await chrome.storage.local.get(key);
    return res[key];
  }

  async function set(key, value) {
    assertAvailable();
    await chrome.storage.local.set({ [key]: value });
  }

  async function remove(key) {
    assertAvailable();
    await chrome.storage.local.remove(key);
  }

  // TTL helpers: stored as { value, expiresAt }
  async function getTTL(key) {
    const entry = await get(key);
    if (!entry || typeof entry !== "object") return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await remove(key);
      return null;
    }
    return entry.value;
  }

  async function setTTL(key, value, ttlMs) {
    await set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  ns.storage = { get, set, remove, getTTL, setTTL };
})();
