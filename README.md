<h1 align="center">Subtle for YouTube</h1>

<p align="center"><strong>A minimal YouTube subscriptions feed that feels native.</strong></p>

<p align="center">
  <a href="https://github.com/justintylerm/subtle-youtube/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/justintylerm/subtle-youtube?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2f3640?style=flat-square"></a>
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-ef5f55?style=flat-square">
</p>

<p align="center">
  <img src="assets/demo.gif" alt="Subtle for YouTube Chrome extension switching between Grid, List, and Default modes on the desktop YouTube Subscriptions feed" width="800">
</p>

Subtle for YouTube is a lightweight, open-source Chrome extension made exclusively for the **desktop YouTube Subscriptions feed**. It adds native-looking Grid, List, and Default view controls directly to YouTube's interface, with options to hide Shorts, livestreams, view counts, autoplay previews, channel avatars, verified badges, and other distracting feed elements.

It does not redesign the YouTube home page, video player, search, or channel pages. Subtle stays focused on one place: [`youtube.com/feed/subscriptions`](https://www.youtube.com/feed/subscriptions).

## Three native-style feed modes

### Grid view

A calm, consistent three-column video grid designed to look like it shipped with YouTube. Grid view removes mixed shelves and gives you optional controls for hiding channel avatars, view counts, autoplay previews, multi-creator uploads, livestreams—including archived videos marked “Streamed”—and verified badges.

### List view

A compact, title-first subscription feed for scanning more uploads at once. List view removes thumbnails and extra card chrome while keeping the channel name, upload date, and video duration easy to read.

### Default view

Returns the Subscriptions page to YouTube's original desktop feed layout whenever you want it. Switching modes is instant and does not require a page reload.

## Why Subtle feels native

- The mode control sits inside YouTube's existing desktop header
- Controls follow YouTube's spacing, typography, colors, menus, and light/dark themes
- Changes apply live without sending you to a separate dashboard
- The extension affects only the desktop Subscriptions feed
- Narrow and mobile-sized windows automatically fall back to YouTube's layout

The goal is simple: improve YouTube subscriptions without making the site feel modified.

## Focus controls

- Hide Shorts shelves and mixed-content sections in focused views
- Hide livestreams and completed stream uploads labeled “Streamed”
- Hide video view counts and their play icons
- Hide channel avatars and verified badges
- Hide multi-creator or collaboration uploads
- Disable autoplay thumbnail previews
- Turn thumbnails grayscale to reduce visual pull
- Save every preference locally in Chrome

## Install

Subtle for YouTube is currently distributed as an unpacked Chrome extension.

1. Download the ZIP from the [latest release](https://github.com/justintylerm/subtle-youtube/releases/latest).
2. Unzip it somewhere you plan to keep it.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode**.
5. Choose **Load unpacked** and select the unzipped folder.
6. Open the [desktop YouTube Subscriptions feed](https://www.youtube.com/feed/subscriptions).

Use the new control beside YouTube's account controls to switch between Grid, List, and Default views. Use the half-tone circle button for grayscale thumbnails, or open the extension from Chrome's toolbar to customize Grid view.

## Privacy

Subtle for YouTube has no analytics, ads, trackers, account access, or remote services. It does not collect browsing history, video history, or personal data. The extension stores only your display preferences in Chrome's local extension storage.

Read the full [privacy policy](PRIVACY.md).

## Browser and page support

- Google Chrome and Chromium-based desktop browsers
- YouTube's desktop Subscriptions page only
- Chrome Manifest V3

YouTube changes its page structure regularly. If something looks wrong, open an [issue](https://github.com/justintylerm/subtle-youtube/issues) with your browser version and a screenshot.

## Contributing

Subtle for YouTube has no build step or runtime dependencies. Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the local development workflow.

## Disclaimer

Subtle for YouTube is an independent, open-source project and is not affiliated with, endorsed by, or sponsored by YouTube or Google. YouTube is a trademark of Google LLC.

## License

[MIT](LICENSE) © justintylerm
