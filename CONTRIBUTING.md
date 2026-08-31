# Contributing

Thanks for helping keep YouTube subscriptions calm and useful.

## Local development

1. Clone or download the repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the repository folder.
5. After editing, click the extension's **Reload** button and refresh the YouTube tab.

The project intentionally has no build step or runtime dependencies. JavaScript, CSS, HTML, and the Manifest V3 file run directly from the repository.

## Pull requests

- Keep changes focused and explain the user-facing reason.
- Test Grid, List, and Default views on the desktop Subscriptions page.
- Confirm the browser console has no new extension errors.
- Do not add analytics, trackers, or remote code.
- Include before/after screenshots for visual changes when possible.

YouTube frequently changes its DOM. Prefer selectors that support both current view-model markup and the older Polymer elements already handled in the codebase.
