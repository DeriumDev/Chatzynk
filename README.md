# ChatZynk — Supabase edition

This build uses **Supabase for authentication, database, realtime updates, and media storage**. There are no Firebase SDK imports or Firebase configuration files.

## 1. Add Supabase project keys

Open `supabase-config.js` and replace:
- `YOUR_SUPABASE_PROJECT_URL`
- `YOUR_SUPABASE_ANON_PUBLIC_KEY`

Find both in Supabase Dashboard → Project Settings → API. Use the project URL and the **anon/public** key (not the service-role secret).

## 2. Create the database

In Supabase Dashboard → SQL Editor → New query, paste and run all of `supabase-schema.sql`.

This creates profiles, friendships, blocks, groups, group members and messages, enables row-level security, creates the `chat-media` storage bucket, and configures realtime publication.

## 3. Enable anonymous sign-in

Supabase Dashboard → Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable.

The app uses an anonymous Supabase user ID as the account ID. Clearing browser/app data may lose access to that anonymous account. For durable accounts, add email/OTP login before launch.

## 4. Deploy

Keep these files together in the site root:
- `index.html`
- `app.js`
- `styles.css`
- `supabase-config.js`

`supabase-schema.sql` is for setup and does not need to be served publicly.

## Notes

- Image/audio uploads are limited to 15 MB and stored in the public `chat-media` bucket. Anyone with a media URL can view that media; do not upload sensitive/private images.
- RLS protects profile writes, group membership, messages, and uploads. Review policies before production; test with at least two separate accounts.
- Online status is a best-effort heartbeat, not guaranteed if a browser is force-closed.
- Browser notifications require permission and the app to be open; true background push notifications need a service worker and push setup.
- The current UI provides text, image and audio messages. Video and arbitrary file types are not enabled.
