// Cloudflare Worker: serve the CNS Training Portal at its exact legacy path
//   https://caregiverng.com/cns_training_portal.html  ->  Cloudflare Pages
// Every other URL on caregiverng.com is left alone and keeps going to
// Hostinger (your WordPress site). Only this one path is served from Pages.
//
// 1) Deploy this Worker.
// 2) Change PAGES_ORIGIN below to YOUR Pages project address (no slash at the end).
// 3) Add a Worker Route:  caregiverng.com/cns_training_portal.html

const PAGES_ORIGIN = "https://cns-training-portal.pages.dev"; // <-- change to your Pages URL

export default {
  async fetch(request) {
    const fileUrl = PAGES_ORIGIN + "/cns_training_portal.html";
    const upstream = await fetch(fileUrl, { cf: { cacheTtl: 300, cacheEverything: true } });
    const headers = new Headers(upstream.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=300");
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
