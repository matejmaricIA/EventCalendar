## Podsjeti.Me – Chrome Web Store privacy/disclosure notes

This document is a copy/paste helper for the Chrome Web Store “Privacy practices” section. Review and adjust to match your actual deployment.

### What the extension does (1–2 sentences)

Podsjeti.Me lets a user select a date/time on a web page and create a Google Calendar event. It reads the selected text and basic page metadata to prefill an event editor, and creates the event only when the user clicks “Add to Google Calendar”.

### User data: what’s handled

- Website content: the selected text the user highlights.
- Web/page metadata: page URL + title (used as “Source” and placed in event description).
- User-provided content: event title, date/time, location, notes, reminders, calendar ID.
- Authentication: Google OAuth token (handled via `chrome.identity`).

### User data: how it’s used

- Core functionality only (parsing and creating calendar events).
- No advertising, analytics, or marketing.

### User data: where it goes

- Stored locally in extension storage for the active session / until the event is created.
- Sent to Google Calendar API when the user clicks “Add to Google Calendar”.
- Not sent to any developer-controlled servers.

### Sale / sharing

- Data is not sold.
- Data is only shared with Google as needed to create the calendar event.

### Encryption

- Data sent to Google Calendar API uses HTTPS (encrypted in transit).

### On-device processing

- Date parsing and event draft preparation happens locally on-device.

### Remote code

- No remote code is loaded or executed. The extension ships with bundled JS/CSS/HTML only.

### Permission justifications (copy/paste)

- `contextMenus`: add a right-click menu item for selected text.
- `activeTab`: allow reading the currently active tab context after user interaction.
- `scripting`: extract the selected text and nearby heading/context from the current page.
- `storage`: store the captured selection/context and user settings (e.g. language).
- `identity`: obtain a Google OAuth token to call Google Calendar API.
- `windows`: open a small editor window to let the user review/edit details before creating the event.
- Host permission `https://www.googleapis.com/*`: create events via Google Calendar API.
