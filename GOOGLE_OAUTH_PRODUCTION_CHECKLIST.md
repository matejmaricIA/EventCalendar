## Podsjeti.Me – Google OAuth / Calendar API production checklist

This extension uses `chrome.identity` + Google Calendar API (`https://www.googleapis.com/auth/calendar.events`).

### 1) Confirm your scope/verification expectations

`calendar.events` is generally treated as a **sensitive** scope. If you’re going to make the extension available to the public, you may need Google OAuth verification and (sometimes) domain ownership verification.

Reference: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification

### 2) Get the final Chrome Web Store extension ID

You’ll only know the final ID after creating/uploading the item in the Chrome Web Store Developer Dashboard.

Use that **Web Store extension ID** for the OAuth client.

### 3) OAuth consent screen (Google Cloud Console)

Make sure the OAuth consent screen has, at minimum:

- Publishing status appropriate for your release (Testing vs In production)
- App name, support email
- **Privacy policy URL** (public)
- Authorized domains (matching your privacy policy domain)
- Requested scopes (keep to the minimum: `calendar.events`)
- Test users (if you’re still in Testing)

### 4) Create the OAuth client credential for the extension

Create an OAuth 2.0 Client ID with:

- Application type: **Chrome App**
- Chrome App ID: the **final Web Store extension ID**

Copy the Client ID and set it in `manifest.json`:

- `oauth2.client_id`

### 5) Re-test the review flow

Before submitting for review:

- Install the packed extension build you plan to upload.
- Verify `chrome.identity` prompts correctly.
- Verify adding an event works end-to-end in Google Calendar.

### 6) Keep URLs consistent across store + Google

The privacy policy URL you put in the Chrome Web Store listing should match the one on your OAuth consent screen.
