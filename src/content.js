// content.js — mount and activate the extension only on subscriptions.
(() => {
  const ns = (window.__YLS = window.__YLS || {});

  function isSubscriptionsPage() {
    return location.pathname === "/feed/subscriptions";
  }

  // Anchor into YouTube's masthead (top nav) so our controls sit next to the
  // Create / notifications / avatar cluster. Present on every YT page.
  function findAnchor() {
    return (
      document.querySelector('ytd-masthead #end') ||
      document.querySelector('#masthead-container #end') ||
      document.querySelector('#masthead #end')
    );
  }

  // Mount the toolbar once, then sync the on-subs state. Retries until the
  // masthead is in the DOM (YT renders async after a full page load).
  function mountWithRetry(maxMs = 15000, intervalMs = 250) {
    const startedAt = Date.now();
    const tick = async () => {
      if (!document.getElementById("yt-latest-root")) {
        const anchor = findAnchor();
        if (anchor) {
          await ns.ui.mount(anchor);
        } else if (Date.now() - startedAt < maxMs) {
          setTimeout(tick, intervalMs);
          return;
        }
      }
      ns.ui.setOnSubs(true);
    };
    tick();
  }

  async function applyGrayscaleFromStorage() {
    try {
      const on = await ns.storage.get("yls:grayscale");
      document.documentElement.classList.toggle("yls-grayscale", on === true);
    } catch (_) { /* storage unavailable — skip */ }
  }

  function syncForCurrentPage() {
    if (!isSubscriptionsPage()) {
      ns.ui.unmount();
      document.documentElement.classList.remove("yls-grayscale");
      return;
    }
    applyGrayscaleFromStorage();
    const existing = document.getElementById("yt-latest-root");
    if (existing && !document.body.contains(existing)) ns.ui.unmount();
    mountWithRetry();
  }

  window.addEventListener("yt-navigate-finish", syncForCurrentPage);

  // Initial mount for full page load.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      syncForCurrentPage();
    });
  } else {
    syncForCurrentPage();
  }
})();
