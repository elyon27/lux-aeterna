# Lux Aeterna — Memorial Prayers & Candles

**Standalone HTML prototype — draft version 0.1.0**

A mobile-first, Catholic-inspired memorial sanctuary for the departed, prepared for a future independent GitHub repository, Netlify deployment, and Supabase project.

## What works in this draft

- Responsive sanctuary homepage, memorial register, candle gallery, prayer page, and about page.
- Add, search, edit, or delete private memorials with optional dates and tributes.
- Offer **24-hour symbolic candles** to a selected memorial. Countdown refreshes while the candle section is open.
- Save personal prayers against memorials; view or delete them.
- Export prototype data as JSON; delete all data from this browser.
- Standalone privacy policy, favicon, and Netlify security-header configuration.

## Important limitations

**This is a local-only prototype, not a hosted multiuser application.** No login, email, cloud storage, public memorials, public prayer wall, Supabase client, or payment functionality is active. Data is held in `localStorage` in the browser profile/device and may be lost when browser data is cleared. An exported backup is not currently importable in the UI. Do not treat localStorage as a secure store for confidential information.

The visual candle is a devotional symbol; no assertion is made that it changes the condition of a departed soul.

## Open locally

Open `index.html` directly in a modern browser. For more consistent testing, use a local static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. No dependency install or build step is required.

## Publish to GitHub and Netlify later

1. Create a new repository, for example `lux-aeterna`, and upload the **contents** of this folder (including `netlify.toml`).
2. In Netlify, add a site from that Git repository. Base directory: repository root. Build command: **leave blank**. Publish directory: `.`.
3. Confirm the site, mobile navigation, local-only warning, and `privacy.html` work. Do not describe the prototype as a live multiuser service.
4. Create a *new, independent* Supabase project only when ready for the next phase. Avoid embedding service-role keys in frontend files.

## Suggested Supabase phase (not implemented)

- Supabase Auth for individual pilgrim accounts.
- Row-level security for `memorials`, `candles`, `prayers`, and ownership links; each record owned by `auth.uid()`.
- Keep all data **private by default**; allow public sharing only with a deliberate opt-in and appropriate moderation.
- Server-generated timestamps for 24-hour candle expiration; avoid trusting client clocks.
- Secure delete-account workflow purging all owned dependent data and the Auth identity, then verify deletion by re-registration testing.
- Consent/privacy review, policy update, retention and deletion documentation, abuse controls, backup strategy, and mobile accessibility testing.
- If creating a public Prayer Wall later, it needs its own privacy and reporting/moderation controls.

## Folder structure

```
index.html
privacy.html
netlify.toml
assets/
  favicon.svg
  css/styles.css
  js/app.js
```

**Copyright:** CrownMind Institute. Initial prototype prepared November 10, 2026.
