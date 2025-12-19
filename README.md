# Kalendar (Chrome/Edge extension)

Add a selected film date/time to Google Calendar in one right-click. Designed for quick scheduling from local cinema pages like Kino Tuskanac and Kinoteka.

## What it does

- Adds a right-click menu item: **Add to Google Calendar**
- Parses Croatian and English date/time formats like `Nedjelja, 28.12.2025 21:00`, `Dec 28, 2025 7pm`, `today 19:00`, or `19:00-21:15`
- Guesses event title from the page heading/title
- Guesses venue from known cinema names
- Lets you adjust title, time, venue, notes, and reminder before syncing

## Setup (Google Calendar API)

1. Create a Google Cloud project: https://console.cloud.google.com/
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen.
4. Create OAuth 2.0 client credentials:
   - Application type: **Chrome App** (used for `chrome.identity`).
   - Extension ID: load the extension once, copy its ID from `chrome://extensions`, then use it here.
5. Update `manifest.json`:
   - Replace `oauth2.client_id` with your client ID.

## Install locally

Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder

Edge:
1. Open `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder

## Usage

1. Select a date/time on a cinema page.
2. Right click and choose **Add to Google Calendar**.
3. Review the event details and adjust if needed.
4. Click **Add to Google Calendar** to sync.

## Customize

- Known venues and addresses: `popup.js` (`knownVenues`)
- Default duration: `popup.js` (`defaultDurationMinutes`)
- Default reminder: `popup.js` (`defaultReminderMinutes`)
- Date parsing rules: `parser.js`

## Tests

- Run `node tests/dateParser.test.js`

## Notes

- Event data is stored only in session storage between the context menu click and the popup.
- The extension uses `chrome.identity` to request access to your Google Calendar.
