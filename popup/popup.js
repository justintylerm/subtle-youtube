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
  const labels = {
    hideAvatars: "Hide channel avatars",
    hideViewCounts: "Hide view counts",
    disableHover: "Disable autoplay previews",
    hideCollaborations: "Hide multi-creator uploads",
    hideLiveStreams: "Hide livestreams",
    hideVerifiedBadges: "Hide verified badges",
  };
  const container = document.getElementById("settings");
  let settings = { ...defaults };

  function createRow(key) {
    const button = document.createElement("button");
    button.className = "setting";
    button.type = "button";
    button.setAttribute("aria-pressed", settings[key] ? "true" : "false");

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = labels[key];

    const track = document.createElement("span");
    track.className = "switch";
    track.setAttribute("aria-hidden", "true");
    const knob = document.createElement("span");
    knob.className = "knob";
    track.appendChild(knob);
    button.append(label, track);

    button.addEventListener("click", () => {
      settings[key] = !settings[key];
      button.setAttribute("aria-pressed", settings[key] ? "true" : "false");
      chrome.storage.local.set({ [STORAGE_KEY]: { ...settings } });
    });
    return button;
  }

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    settings = { ...defaults, ...(result[STORAGE_KEY] || {}) };
    container.replaceChildren(...Object.keys(defaults).map(createRow));
  });
})();
