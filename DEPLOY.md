# Deploying the CNS Training Portal to GitHub + Cloudflare

Goal: the portal lives on Cloudflare (fast, no Hostinger upload problems), but
the public address stays exactly `caregiverng.com/cns_training_portal.html` so
every certificate, QR code and training link keeps working. The rest of
caregiverng.com stays on Hostinger / WordPress, untouched.

## Step 1 - Put the files on GitHub
1. Create a new repository, for example `cns-training-portal`.
2. Upload the contents of this folder (`cns_training_portal.html`, `worker.js`,
   `README.md`, `DEPLOY.md`).

## Step 2 - Connect Cloudflare Pages
1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** ->
   **Connect to Git**, and pick the repository.
2. Build settings:
   - Framework preset: **None**
   - Build command: **leave empty**
   - Output directory: **/**
3. Click **Save and Deploy**. After a minute you get an address like
   `cns-training-portal.pages.dev`.
4. Test it: open `https://cns-training-portal.pages.dev/cns_training_portal.html`.
   The portal should load fully.

## Step 3 - Bring the domain onto Cloudflare (DNS)
(Do this carefully, with Tuoyo, because it affects the whole live site.)
1. Add `caregiverng.com` as a site in Cloudflare.
2. Cloudflare will import your current DNS records. **Check them all** against
   Hostinger first, especially the `A` record (points to the Hostinger server IP)
   and the `MX` records (email). The `A` record should be **Proxied** (orange cloud).
3. At your domain registrar, change the nameservers to the two Cloudflare ones.
4. Wait for it to go active. The website keeps serving from Hostinger as normal.

## Step 4 - Serve the portal at the exact path (the Worker)
1. Open `worker.js` and change `PAGES_ORIGIN` to your Pages address from Step 2
   (for example `https://cns-training-portal.pages.dev`).
2. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Create Worker**,
   paste in the edited `worker.js`, and **Deploy**.
3. In that Worker -> **Settings** -> **Domains & Routes** -> **Add route**:
   - Route: `caregiverng.com/cns_training_portal.html`
   - Zone: `caregiverng.com`
4. Save.

## Step 5 - Check it
- Open `https://caregiverng.com/cns_training_portal.html`. The new portal should
  load, at the exact old address. Certificates and QR codes keep pointing here.
- Open any other page of caregiverng.com. It still loads from Hostinger as before.

## Updating later
Change the file on GitHub, and Cloudflare Pages redeploys it on its own within a
minute. Nothing else to touch.
