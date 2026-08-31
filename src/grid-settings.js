(() => {
  const STORAGE_KEY = "yls:grid-settings";
  const defaults = {
    hideAvatars: true,
    hideViewCounts: true,
    disableHover: true,
    hideCollaborations: true,
    hideLiveStreams: true,
    hideVerifiedBadges: true,
  };
  const classNames = {
    hideAvatars: "yls-grid-hide-avatars",
    hideViewCounts: "yls-grid-hide-view-counts",
    disableHover: "yls-grid-disable-hover",
    hideCollaborations: "yls-grid-hide-collaborations",
    hideLiveStreams: "yls-grid-hide-live-streams",
    hideVerifiedBadges: "yls-grid-hide-verified-badges",
  };

  function apply(settings) {
    const merged = { ...defaults, ...(settings || {}) };
    for (const [key, className] of Object.entries(classNames)) {
      document.documentElement.classList.toggle(className, merged[key] === true);
    }
  }

  // Apply the established Grid defaults synchronously, then replace them
  // with the saved choices as soon as storage responds.
  apply(defaults);
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (!chrome.runtime.lastError) apply(result[STORAGE_KEY]);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    apply(changes[STORAGE_KEY].newValue);
  });
})();
