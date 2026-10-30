# Connect MIMORA accounts

The app is connected to the owner’s Supabase project. On 28 October 2026, both tables, enabled row-level security, matching owner policies and denial of anonymous reads were verified. The Site URL and three exact redirect URLs below were configured. The owner confirmed email sign-in and profile entry work. Cross-device persistence still needs an end-to-end test. The project currently uses the default email sender; configure custom SMTP before inviting public users.

## 1. Create the database tables

In your Supabase project, open SQL Editor → New query. Paste and run `supabase/migrations/001_profiles.sql` from this repository. It creates profiles and saved reports, with row-level security so signed-in users can access only their own rows. Run this migration before enabling the public frontend configuration.

## 2. Configure sign-in

Enable the Email provider in Authentication. The app uses email magic links; no password is requested.

Set the Site URL to `https://kopriya.github.io/mimora/` and add these exact redirect URLs:

- `https://kopriya.github.io/mimora/`
- `http://127.0.0.1:4173/` for development
- `https://borrowed-hands-practice-studio.infokomalpriya.chatgpt.site/` if using the original private Site

When you add a custom domain, add its exact HTTPS origin and path here too. The original Site's private audience is separate from Supabase sign-in.

For a public launch, configure your own SMTP provider and verify sender-domain DNS. Supabase's default email service is intended for limited testing and can restrict recipients and delivery rates. Test with a permitted email first.

## 3. Connect the public configuration

From the project's Connect dialog or API settings, copy its project URL and **publishable key** (`sb_publishable_...`). A legacy `anon` key also works. These values are designed for browser use; ownership protection comes from the database policies.

Never use a `service_role`, `sb_secret_...`, database password, or personal access token in this app or chat.

Set `supabaseUrl` and `supabasePublishableKey` in `dist/config.js`, then publish the app. No npm install is required. The browser loads the pinned Supabase client from jsDelivr when configured. Only `dist/` is served by GitHub Pages.

## 4. Validate before inviting learners

1. Sign in using the emailed link. Save a learning profile.
2. Sign in as the same person on another device; confirm profile, goal and preferred workspace load.
3. Save a practice report; confirm it appears on the second device. Original recordings are not uploaded, so playback there requires the original files.
4. Use a second test account. Confirm it cannot read, update, insert under, or delete the first account's rows through the Supabase API. Repeat while signed out. Test database authorization, not only UI filtering.
5. Sign out and confirm the previous person's profile, recordings and history clear from the screen. Sign in again and verify recovery.
6. Test expired links, blocked email, network errors and denied database operations. Configure production SMTP and monitor delivery.

## Data stored

- Profile: name, skill, experience level, learning goal, practice language, feedback preference.
- Saved reports: observations, context/checklist, results, file names/durations, note events, compact waveforms and audio measurements.
- Original audio/video and raw samples stay on the device and are not uploaded.
- Sign-in sessions persist in browser storage using the Supabase SDK. Guest profile changes last only until reload.
- The library shows the latest 30 reports; older reports remain in the database. Clear history removes all reports owned by that account. Account deletion through Supabase cascades to its profiles/reports.
- Earlier v1 local reports are not automatically transferred to cloud accounts. Existing browser storage is not deleted by this update.

## References

- [Email magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [User-owned data and row-level security](https://supabase.com/docs/guides/auth/managing-user-data)
- [Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
