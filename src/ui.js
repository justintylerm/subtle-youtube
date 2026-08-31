// ui.js — mount toolbar over YouTube's native subs feed, apply mode class,
// inject the list-view metadata bar into native rich-items.
// Clean/minimal modes are CSS-only on top of the native feed.
(() => {
  const ns = (window.__YLS = window.__YLS || {});
  const VIEW_STATE_KEY = "yls:view-state"; // "clean" | "minimal" | "native"
  const GRAYSCALE_KEY = "yls:grayscale";
  const MODE_ORDER = ["clean", "minimal", "native"];
  const MODE_LABELS = {
    clean: "Grid view",
    minimal: "List view",
    native: "Default view",
  };
  const MODE_HINTS = {
    clean: "Simplified feed",
    minimal: "Titles only",
    native: "YouTube default",
  };
  const MODE_ICONS = {
    clean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    minimal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
    native: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v4H4z"/><path d="M4 12h10v8H4z"/><path d="M16 12h4v8h-4z"/></svg>',
  };
  const CARET_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const GRAYSCALE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor"/></svg>';

  const state = {
    root: null,
    modeDrop: null,
    modeDropTrigger: null,
    modeDropMenu: null,
    modeWidthAnimation: null,
    grayscaleBtn: null,
    mode: "clean",
    grayscale: false,
    observer: null,
    onSubsRequested: false,
    mobileQuery: null,
  };

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const k of Object.keys(props)) {
      if (k === "class") node.className = props[k];
      else if (k === "style" && typeof props[k] === "object") Object.assign(node.style, props[k]);
      else if (k.startsWith("on") && typeof props[k] === "function") node.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k === "html") node.innerHTML = props[k];
      else node.setAttribute(k, props[k]);
    }
    for (const c of children) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  // YouTube's dimensional masthead buttons are not produced by the outer
  // button class alone. Their raised rim and light wash come from these
  // internal native elements. Mirror the exact Create-button structure so
  // YouTube's own styles and experiments render the treatment for us.
  function addNativeButtonChrome(button) {
    Array.from(button.children).forEach((child) => {
      child.classList.add("ytSpecButtonShapeNextElevatedContent");
    });

    button.appendChild(
      el(
        "yt-touch-feedback-shape",
        {
          class:
            "ytSpecTouchFeedbackShapeHost " +
            "ytSpecTouchFeedbackShapeTouchResponse",
          "aria-hidden": "true",
        },
        [
          el("div", { class: "ytSpecTouchFeedbackShapeStroke" }),
          el("div", { class: "ytSpecTouchFeedbackShapeFill" }),
        ]
      )
    );

    button.appendChild(
      el(
        "yt-light-shape",
        {
          class:
            "contribYtLightShapeHost " +
            "contribYtLightShapeStaticRimLight " +
            "contribYtLightShapeStaticRimLightTonal",
          "aria-hidden": "true",
          style: {
            "--yt-light-wash-opacity": "0",
            "--yt-light-wash-x": "0px",
            "--yt-light-wash-y": "0px",
            "--yt-light-wash-size": "0px",
          },
        },
        [
          el("div", {
            class:
              "contribYtLightShapeStaticWashLight " +
              "contribYtLightShapeStaticWashLightTonal",
          }),
        ]
      )
    );

    return button;
  }

  // ---- Native card introspection ----
  function extractVideoInfo(card) {
    const link =
      // Modern "view-model" DOM
      card.querySelector('a.ytLockupViewModelContentImage[href*="/watch?v="]') ||
      card.querySelector('a.ytLockupMetadataViewModelTitle[href*="/watch?v="]') ||
      // Legacy Polymer DOM
      card.querySelector('a#thumbnail[href*="/watch?v="]') ||
      card.querySelector('a#video-title-link[href*="/watch?v="]') ||
      card.querySelector('a.yt-simple-endpoint[href*="/watch?v="]');
    if (!link) return null;
    const href = link.getAttribute("href") || "";
    const m = href.match(/[?&]v=([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const videoId = m[1];
    const titleEl =
      card.querySelector("a.ytLockupMetadataViewModelTitle") ||
      card.querySelector(".ytLockupMetadataViewModelTitle") ||
      card.querySelector("#video-title, #video-title-link");
    const title = (titleEl?.textContent || titleEl?.getAttribute("title") || titleEl?.getAttribute("aria-label") || "").trim();
    const channelName = extractChannelName(card);
    return { videoId, title, channelName };
  }

  // Channel name — current DOM collapses metadata to one row per card:
  // channel · [▶] views · time. When the row carries the views leading-icon,
  // the channel is the first text part, preferring link text. Older builds
  // use a separate non-delimited channel row: fall back to row text with
  // verified-badge / inline-icon nodes stripped so "ChannelNameVerified"
  // doesn't creep in when the badge has accessible text. Legacy Polymer DOM
  // last-resort.
  function extractChannelName(card) {
    const rows = card.querySelectorAll(".ytContentMetadataViewModelMetadataRow");
    for (const row of rows) {
      if (row.querySelector(".ytContentMetadataViewModelLeadingIcon")) {
        const first = row.querySelector("span.ytAttributedStringHost");
        if (first) {
          const link = first.querySelector("a");
          const t = ((link || first).textContent || "").trim();
          if (t) return t;
        }
        continue;
      }
      if (row.querySelector(".ytContentMetadataViewModelDelimiter")) continue;
      const link = row.querySelector("a");
      if (link) {
        const t = (link.textContent || "").trim();
        if (t) return t;
      }
      const clone = row.cloneNode(true);
      clone.querySelectorAll(
        "yt-icon, .yt-icon-shape, .ytSpecIconShapeHost, img, " +
        ".ytAttributedStringInlineImageContainer, " +
        ".ytContentMetadataViewModelBadgeContainer, " +
        ".ytContentMetadataViewModelBadge"
      ).forEach((n) => n.remove());
      const text = (clone.textContent || "").trim();
      if (text) return text;
    }
    const legacy =
      card.querySelector("#channel-name a, ytd-channel-name a") ||
      card.querySelector("#text.ytd-channel-name, ytd-channel-name yt-formatted-string");
    return legacy ? (legacy.textContent || "").trim() : "";
  }

  // Solo uploads have exactly one linked channel destination. Collaboration
  // credits may use multiple links or a plain-text collapsed attribution.
  // Inspect that structure instead of parsing names or video titles.
  function hasMultipleChannels(card) {
    const channelHrefs = new Set();
    const rows = card.querySelectorAll(".ytContentMetadataViewModelMetadataRow");
    let foundModernChannelRow = false;

    // Current single-row format: channel · [▶] views · time. Credited
    // channels are the text parts BEFORE the views (leading-icon) part —
    // solo uploads have exactly one; collaborations render one part per
    // channel ("Chan A", "and Chan B") or a collapsed "and N more" part.
    for (const row of rows) {
      if (!row.querySelector(".ytContentMetadataViewModelLeadingIcon")) continue;
      const rowText = (row.textContent || "").replace(/\s+/g, " ").trim();
      const rowLabel = row.getAttribute("aria-label") || "";
      if (
        /\band\s+\d+\s+more\b/i.test(rowText) ||
        /\band\s+\d+\s+more\b/i.test(rowLabel)
      ) {
        return true;
      }
      let channelParts = 0;
      for (const child of row.children) {
        if (child.classList.contains("ytContentMetadataViewModelLeadingIcon")) break;
        if (child.matches("span.ytAttributedStringHost")) channelParts++;
      }
      if (channelParts >= 1) return channelParts >= 2;
    }

    for (const row of rows) {
      // The views/date row contains a delimiter and is never a channel row.
      if (row.querySelector(".ytContentMetadataViewModelDelimiter")) continue;
      const rowText = (row.textContent || "").replace(/\s+/g, " ").trim();
      if (!rowText) continue;
      foundModernChannelRow = true;

      // Current YouTube builds collapse collaboration credits into one
      // channel-row label, e.g. "Creator and 2 more", rather than exposing a
      // link for every credited channel.
      const rowLabel = row.getAttribute("aria-label") || "";
      if (
        /\band\s+\d+\s+more\b/i.test(rowText) ||
        /\band\s+\d+\s+more\b/i.test(rowLabel)
      ) {
        return true;
      }

      row.querySelectorAll("a[href]").forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (
          href.startsWith("/@") ||
          href.startsWith("/channel/") ||
          href.startsWith("/c/") ||
          href.startsWith("/user/")
        ) {
          channelHrefs.add(href.split(/[?#]/)[0]);
        }
      });

      // The captured subscription-feed markup gives solo creators exactly
      // one clickable /@channel-style link. Collaboration attributions are
      // deliberately rendered as plain text, whether that text is
      // "Creator and 2 more" or "Creator A and Creator B". Treat a populated
      // creator row with no channel destination as multi-creator.
      const modernChannelLinks = row.querySelectorAll(
        'a[href^="/@"], a[href^="/channel/"], ' +
        'a[href^="/c/"], a[href^="/user/"]'
      );
      if (modernChannelLinks.length === 0) return true;
    }

    // Legacy Polymer cards keep credited creators inside ytd-channel-name.
    card.querySelectorAll(
      'ytd-channel-name a[href^="/@"], ' +
      'ytd-channel-name a[href^="/channel/"], ' +
      'ytd-channel-name a[href^="/c/"], ' +
      'ytd-channel-name a[href^="/user/"]'
    ).forEach((link) => {
      const href = link.getAttribute("href") || "";
      channelHrefs.add(href.split(/[?#]/)[0]);
    });

    // Legacy/fallback metadata sometimes places the collapsed credit text
    // outside the modern metadata-row element.
    const legacyChannel = card.querySelector(
      "#channel-name, ytd-channel-name, .ytd-channel-name"
    );
    if (legacyChannel) {
      const legacyText = (legacyChannel.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      const legacyLabel = legacyChannel.getAttribute("aria-label") || "";
      if (
        /\band\s+\d+\s+more\b/i.test(legacyText) ||
        /\band\s+\d+\s+more\b/i.test(legacyLabel)
      ) {
        return true;
      }
    }

    // If the modern channel row was present, exactly one distinct linked
    // creator is the only solo-upload shape we allow through.
    if (foundModernChannelRow) return channelHrefs.size !== 1;
    return channelHrefs.size >= 2;
  }

  function isLiveVideo(card) {
    if (
      card.querySelector(
        '[overlay-style="LIVE"], ' +
        'ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"], ' +
        '.badge-style-type-live-now, .yt-badge-shape--live'
      )
    ) {
      return true;
    }

    const liveAreas = card.querySelectorAll(
      ".ytBadgeShapeText, .badge-shape-wiz__text, .ytThumbnailBadgeViewModelHost, " +
      "ytd-thumbnail-overlay-time-status-renderer, " +
      ".ytContentMetadataViewModelBadge"
    );
    for (const area of liveAreas) {
      const text = (area.textContent || "").replace(/\s+/g, " ").trim();
      const label = area.getAttribute("aria-label") || "";
      if (/^(live|live now)$/i.test(text) || /\blive now\b/i.test(label)) {
        return true;
      }
    }

    // Completed livestreams lose the LIVE badge and are labeled in the date
    // metadata instead (for example, "Streamed 7d ago"). Keep this scoped to
    // metadata/date elements so a video title containing "streamed" does not
    // get filtered accidentally. Cover both the current view-model DOM and
    // YouTube's legacy ytd-video-meta-block markup.
    const dateAreas = card.querySelectorAll(
      ".ytContentMetadataViewModelMetadataTextLastPart, " +
      ".ytContentMetadataViewModelMetadataRow span.ytAttributedStringHost, " +
      "#metadata-line .inline-metadata-item, " +
      "#metadata-line > span"
    );
    for (const area of dateAreas) {
      const text = (area.textContent || "").replace(/\s+/g, " ").trim();
      const label = area.getAttribute("aria-label") || "";
      if (/\bstreamed\b/i.test(text) || /\bstreamed\b/i.test(label)) {
        return true;
      }
    }
    return false;
  }

  // ---- List-view metadata extraction ----
  // Pull "1 hour ago" out of the metadata. Current DOM marks the time part
  // with an explicit last-part class; older builds put it last in the
  // views·time row. Falls back to the last metadata row and legacy Polymer.
  function extractDate(card) {
    const lastPart = card.querySelector(
      ".ytContentMetadataViewModelMetadataTextLastPart"
    );
    if (lastPart) {
      const t = (lastPart.textContent || "").trim();
      if (t) return t;
    }
    const delimRow = card.querySelector(
      ".ytContentMetadataViewModelMetadataRow:has(> .ytContentMetadataViewModelDelimiter)"
    );
    if (delimRow) {
      const spans = delimRow.querySelectorAll("span.ytAttributedStringHost");
      if (spans.length) return (spans[spans.length - 1].textContent || "").trim();
    }
    const rows = card.querySelectorAll(".ytContentMetadataViewModelMetadataRow");
    if (rows.length >= 2) return (rows[rows.length - 1].textContent || "").trim();
    if (rows.length === 1) return (rows[0].textContent || "").trim();
    const legacy = card.querySelector("#metadata-line span:last-child");
    return legacy ? (legacy.textContent || "").trim() : "";
  }

  // Pull the duration ("12:04", "1:02:14") from the thumbnail badge. In
  // minimal mode the thumbnail is display:none but still in the DOM, so
  // textContent reads. YT keeps renaming the badge class (badge-shape-wiz,
  // ytThumbnailBadgeViewModel*, …) so first we try known class selectors,
  // then fall back to a TreeWalker over every text node inside the
  // thumbnail subtree — anything matching a time format wins. Filters out
  // non-time badges ("LIVE", "Premiere", "4K", etc.) via the regex.
  const DURATION_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/;
  function extractDuration(card) {
    const selectors = [
      ".ytBadgeShapeText",
      "badge-shape .ytBadgeShapeText",
      ".badge-shape-wiz__text",
      ".ytThumbnailBadgeViewModelHost .ytThumbnailBadgeViewModelLabel",
      ".ytThumbnailBadgeViewModelHost span",
      "yt-thumbnail-badge-view-model span",
      "badge-shape .badge-shape__text",
      ".badge-shape__text",
      "ytd-thumbnail-overlay-time-status-renderer #text",
      "ytd-thumbnail-overlay-time-status-renderer span",
    ];
    for (const sel of selectors) {
      const nodes = card.querySelectorAll(sel);
      for (const n of nodes) {
        const t = (n.textContent || "").trim();
        if (DURATION_RE.test(t)) return t;
      }
    }
    // Last-resort: walk every text node inside the thumbnail container and
    // match a time-formatted string. Scoped to the thumbnail link so we
    // don't accidentally match timestamps in the title.
    const thumb =
      card.querySelector("a.ytLockupViewModelContentImage") ||
      card.querySelector("yt-thumbnail-view-model") ||
      card.querySelector("a#thumbnail") ||
      card.querySelector("ytd-thumbnail");
    if (thumb) {
      const walker = document.createTreeWalker(thumb, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = (node.nodeValue || "").trim();
        if (DURATION_RE.test(t)) return t;
      }
    }
    return "";
  }

  // Idempotent create-or-update of the per-card list-view metadata bar.
  // Empty values never overwrite existing text, so a later scan can fill in
  // fields that weren't hydrated on the first pass.
  function updateListMeta(card, info) {
    let bar = card.querySelector(":scope > .yls-list-meta");
    if (!bar) {
      bar = el("div", { class: "yls-list-meta" }, [
        el("span", { class: "yls-list-channel" }),
        el("span", { class: "yls-list-date" }),
        el("span", { class: "yls-list-duration" }),
      ]);
      card.appendChild(bar);
    }
    const chanEl = bar.querySelector(".yls-list-channel");
    const dateEl = bar.querySelector(".yls-list-date");
    const durEl = bar.querySelector(".yls-list-duration");
    const channel = info.channelName || "";
    const date = extractDate(card);
    const duration = extractDuration(card);
    if (channel && chanEl.textContent !== channel) chanEl.textContent = channel;
    if (date && dateEl.textContent !== date) dateEl.textContent = date;
    if (duration && durEl.textContent !== duration) durEl.textContent = duration;
  }

  function injectCardControls(card) {
    const info = extractVideoInfo(card);
    if (!info) return; // DOM not ready yet; try on next mutation
    const live = isLiveVideo(card);
    card.classList.toggle("yls-live-upload", live);
    card.classList.toggle(
      "yls-combo-upload",
      !live && hasMultipleChannels(card)
    );
    updateListMeta(card, info);
  }

  function scanAndInject() {
    const cards = document.querySelectorAll(
      'ytd-browse:is([page-subtype="subscriptions"], [page-subtype="home"]) ytd-rich-item-renderer'
    );
    cards.forEach(injectCardControls);
  }

  function startObserver() {
    if (state.observer) return;
    let scheduled = false;
    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        scanAndInject();
      });
    };
    state._scheduleScan = scheduleScan;

    // Broad DOM observer: YouTube hydrates rich-items in stages (shell first,
    // inner link/title later), so a narrow "rich-item added" filter misses
    // the second pass when extractVideoInfo can finally succeed. Debounced
    // via rAF so frequent mutations coalesce into one scan per frame.
    const obs = new MutationObserver(scheduleScan);
    obs.observe(document.body, { childList: true, subtree: true });
    state.observer = obs;

    // Re-scan on viewport changes (window resize, zoom in/out, devicePixelRatio shifts).
    window.addEventListener("resize", scheduleScan, { passive: true });

    // Safety net: poll every 500ms for the first 15s after mount to catch
    // any cards that slip past the observer during initial hydration.
    let ticks = 0;
    state._safetyTimer = setInterval(() => {
      if (ticks++ > 30) { clearInterval(state._safetyTimer); state._safetyTimer = null; return; }
      scanAndInject();
    }, 500);
  }
  function stopObserver() {
    state.observer?.disconnect();
    state.observer = null;
    if (state._scheduleScan) {
      window.removeEventListener("resize", state._scheduleScan);
      state._scheduleScan = null;
    }
    if (state._safetyTimer) {
      clearInterval(state._safetyTimer);
      state._safetyTimer = null;
    }
  }

  // ---- Mode + dropdown ----
  function animateModeTriggerWidth(trigger, oldWidth, newWidth) {
    if (
      Math.abs(newWidth - oldWidth) < 1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const label = trigger.querySelector(".trigger-label");
    if (!label || getComputedStyle(label).display === "none") return;

    state.modeWidthAnimation?.cancel();
    trigger.style.willChange = "width";
    state.modeWidthAnimation = trigger.animate(
      [
        { width: `${oldWidth}px` },
        { width: `${newWidth}px` },
      ],
      {
        duration: 180,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
    state.modeWidthAnimation.finished
      .catch(() => {})
      .finally(() => {
        if (state.modeWidthAnimation?.playState === "finished") {
          trigger.style.willChange = "";
          state.modeWidthAnimation = null;
        }
      });
  }

  function applyMode() {
    const html = document.documentElement;
    html.classList.remove("yls-clean-mode", "yls-minimal-mode", "yls-native-mode");
    html.classList.add(`yls-${state.mode}-mode`);
    if (state.root) state.root.setAttribute("data-mode", state.mode);

    if (state.modeDropTrigger) {
      const oldWidth = state.modeDropTrigger.getBoundingClientRect().width;
      const labelEl = state.modeDropTrigger.querySelector(".trigger-label");
      const iconEl = state.modeDropTrigger.querySelector(".trigger-icon");
      if (labelEl) labelEl.textContent = MODE_LABELS[state.mode];
      if (iconEl) iconEl.innerHTML = MODE_ICONS[state.mode];
      const newWidth = state.modeDropTrigger.getBoundingClientRect().width;
      animateModeTriggerWidth(state.modeDropTrigger, oldWidth, newWidth);
    }
    if (state.modeDropMenu) {
      state.modeDropMenu.querySelectorAll(".yls-modedrop-item").forEach((it) => {
        it.setAttribute(
          "aria-selected",
          it.dataset.modeValue === state.mode ? "true" : "false"
        );
      });
    }
  }

  function closeModeDrop() {
    if (state.modeDrop) state.modeDrop.setAttribute("aria-expanded", "false");
  }
  function toggleModeDrop() {
    if (!state.modeDrop) return;
    const open = state.modeDrop.getAttribute("aria-expanded") === "true";
    state.modeDrop.setAttribute("aria-expanded", open ? "false" : "true");
  }
  async function setMode(newMode) {
    if (!MODE_ORDER.includes(newMode) || newMode === state.mode) return;
    state.mode = newMode;
    await ns.storage.set(VIEW_STATE_KEY, state.mode);
    applyMode();
  }

  function buildModeDropdown() {
    const triggerIcon = el("span", { class: "trigger-icon", "aria-hidden": "true" });
    triggerIcon.innerHTML = MODE_ICONS[state.mode] || MODE_ICONS.clean;
    const triggerLabel = el("span", { class: "trigger-label" }, [MODE_LABELS[state.mode] || ""]);
    const caret = el("span", { class: "caret", "aria-hidden": "true" });
    caret.innerHTML = CARET_SVG;

    const trigger = el(
      "button",
      {
        class:
          "yls-btn yls-modedrop-trigger " +
          "ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal " +
          "ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM " +
          "ytSpecButtonShapeNextIconLeading " +
          "ytSpecButtonShapeNextEnableBackdropFilterExperiment",
        type: "button",
        "aria-haspopup": "listbox",
        onclick: (e) => { e.stopPropagation(); toggleModeDrop(); },
      },
      [triggerIcon, triggerLabel, caret]
    );
    addNativeButtonChrome(trigger);
    state.modeDropTrigger = trigger;

    const items = MODE_ORDER.map((m) => {
      const iconWrap = el("span", { class: "icon" });
      iconWrap.innerHTML = MODE_ICONS[m];
      const checkWrap = el("span", { class: "check" });
      checkWrap.innerHTML = CHECK_SVG;
      return el(
        "div",
        {
          class: "yls-modedrop-item",
          role: "option",
          "data-mode-value": m,
          "aria-selected": m === state.mode ? "true" : "false",
          onclick: () => { setMode(m); closeModeDrop(); },
        },
        [
          iconWrap,
          el("span", { class: "meta" }, [
            el("span", { class: "meta-label" }, [MODE_LABELS[m]]),
            el("span", { class: "meta-hint" }, [MODE_HINTS[m]]),
          ]),
          checkWrap,
        ]
      );
    });
    const menu = el(
      "div",
      { class: "yls-modedrop-menu", role: "listbox", "aria-label": "View mode" },
      items
    );
    state.modeDropMenu = menu;

    const wrap = el("div", { class: "yls-modedrop", "aria-expanded": "false" }, [trigger, menu]);
    state.modeDrop = wrap;
    return wrap;
  }

  // ---- Grayscale ----
  async function toggleGrayscale() {
    state.grayscale = !state.grayscale;
    await ns.storage.set(GRAYSCALE_KEY, state.grayscale);
    applyGrayscale();
  }
  function applyGrayscale() {
    document.documentElement.classList.toggle("yls-grayscale", state.grayscale);
    if (state.grayscaleBtn) {
      state.grayscaleBtn.classList.toggle("yls-grayscale-active", state.grayscale);
      state.grayscaleBtn.setAttribute("aria-pressed", state.grayscale ? "true" : "false");
      state.grayscaleBtn.title = state.grayscale ? "Color thumbnails" : "Grayscale thumbnails";
    }
  }
  function buildGrayscaleBtn() {
    const btn = el("button", {
      class:
        "yls-btn yls-grayscale-btn " +
        "ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal " +
        "ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM " +
        "ytSpecButtonShapeNextIconOnlyDefault " +
        "ytSpecButtonShapeNextEnableBackdropFilterExperiment",
      type: "button",
      title: "Grayscale thumbnails",
      "aria-pressed": "false",
      onclick: toggleGrayscale,
    });
    btn.innerHTML = GRAYSCALE_SVG;
    addNativeButtonChrome(btn);
    state.grayscaleBtn = btn;
    return btn;
  }

  function installDropdownGlobalListeners() {
    if (state._dropdownListenersInstalled) return;
    state._dropdownListenersInstalled = true;
    document.addEventListener("click", (e) => {
      if (!state.modeDrop) return;
      if (state.modeDrop.contains(e.target)) return;
      closeModeDrop();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModeDrop();
    });
  }

  function buildUI() {
    state.root = el("div", { id: "yt-latest-root" }, [
      buildGrayscaleBtn(),
      buildModeDropdown(),
    ]);
    return state.root;
  }

  // Mount the masthead toolbar on ANY YouTube page. Mode state + grayscale
  // state are loaded from storage here; subs-specific behavior (observer,
  // per-card injection) is deferred to setOnSubs().
  async function mount(anchor) {
    if (document.getElementById("yt-latest-root")) return;
    const root = buildUI();
    anchor.insertBefore(root, anchor.firstChild);

    const savedMode = await ns.storage.get(VIEW_STATE_KEY);
    state.mode = MODE_ORDER.includes(savedMode) ? savedMode : "clean";
    applyMode();
    const savedGray = await ns.storage.get(GRAYSCALE_KEY);
    state.grayscale = savedGray === true;
    applyGrayscale();
    installDropdownGlobalListeners();
  }

  // Called by content.js on every page transition. Toggles the `yls-on-subs`
  // class that gates all mode-specific CSS so styles can't leak off the subs
  // page. Also starts / stops the per-card observer.
  function syncResponsiveState() {
    const mobile = state.mobileQuery?.matches === true;
    const customFeedActive = state.onSubsRequested && !mobile;
    document.documentElement.classList.toggle("yls-mobile-disabled", mobile);
    document.documentElement.classList.toggle("yls-on-subs", customFeedActive);
    document.documentElement.classList.toggle(
      "yls-grayscale",
      state.grayscale && !mobile
    );
    if (customFeedActive) {
      scanAndInject();
      startObserver();
    } else {
      stopObserver();
    }
  }

  function installResponsiveListener() {
    if (state.mobileQuery) return;
    state.mobileQuery = window.matchMedia("(max-width: 767px)");
    state.mobileQuery.addEventListener("change", syncResponsiveState);
    syncResponsiveState();
  }

  function setOnSubs(onSubs) {
    state.onSubsRequested = onSubs;
    installResponsiveListener();
    syncResponsiveState();
  }

  function unmount() {
    const existing = document.getElementById("yt-latest-root");
    if (existing) existing.remove();
    // Drop the subs-gate class but keep the persisted mode + grayscale state.
    document.documentElement.classList.remove("yls-on-subs");
    state.onSubsRequested = false;
    stopObserver();
  }

  ns.ui = { mount, unmount, setOnSubs };
})();
