# Lux Aeterna

A static memorial sanctuary for private memorials, photographs, prayers, and 24-hour devotional candles.

## Run

Serve the repository root with `python3 -m http.server 8080` and open `http://localhost:8080`. Netlify publishes the repository root without a build step.

## Account storage

Sign in to save and retrieve private records from the Crown-Articles Supabase project. The web package uses a publishable key and the signed-in user's session. Row-level security controls access to the four Lux Aeterna tables. The `lux_save_memorial` function commits the memorial and its optional photo together.

Existing browser records remain accessible after signing out. They are separate from online records and are not transferred automatically. About → Export My Data exports the currently visible set.

For email-based account confirmation, allowlist the deployed site's exact confirmation redirect URL in the shared Supabase project's Authentication → URL Configuration. Review its email provider before opening registration to the public. Preserve the existing Crown-Articles site URL and redirect entries.

The Netlify Content Security Policy allows the pinned Supabase browser SDK and the Crown-Articles API origin.

## Account deletion

The public entry point is `/delete-account.html`, linked from the site footer and privacy policy. Apply the account-deletion migration to the Crown-Articles Supabase project before publishing the page. The function checks the caller's current password-authenticated session and deletes that login. The existing foreign keys cascade the deletion to all four Lux Aeterna tables.

The login is shared at the project level. The page explains this before deletion. The app stores memorial photos in Postgres. If the login owns objects in Supabase Storage from other project uses, resolve ownership through support before retrying. Browser-only records can be cleared separately via About → Delete All Local Data.
