# CNS Training Portal (front-end)

The public training portal for Caregiver Nigeria Society.

- `cns_training_portal.html` - the whole portal in one self-contained file
  (styles, scripts and the four main logos are built in).
- `worker.js` - Cloudflare Worker that serves this file at the exact URL
  `caregiverng.com/cns_training_portal.html`.
- `DEPLOY.md` - step by step setup for GitHub, Cloudflare Pages and DNS.

## Cloudflare Pages settings
- Framework preset: **None**
- Build command: **(leave empty)**
- Build output directory: **/** (the repo root)

That is all. There is no build step. Pages just serves the file.

## Backend
The data still lives in Google (Google Sheets + Apps Script) for now, exactly
as before. Nothing about the backend changed in this move. The portal reads its
programmes from the shared Google Sheet and sends enrolments/emails to the same
Apps Script web app it always used. Moving the data to Supabase is a later step.

## Two logos to add (optional)
The portal also shows `dlf_logo.png` and `leivotest_logo.png`. These are not
inlined. They load from your existing site, so if they are already on Hostinger
they will still appear; if not, those two small logos simply hide themselves and
everything else works. Send them over if you want them built in too.
