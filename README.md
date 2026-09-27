# eBay Marketplace Account Deletion endpoint

Small Node.js service for eBay's Marketplace Account Deletion notifications. No database or dependencies. It computes eBay's challenge response and acknowledges valid JSON notifications without logging or persisting their payloads.

## Deploy on Railway

1. Create a Railway project/service from this GitHub repository's `main` branch. Build from the repository root (the folder containing `package.json`).
2. Railway detects Node.js and runs `npm start`; the service listens on Railway's `PORT`.
3. Generate a public HTTPS domain in Railway **Settings → Networking**.
4. Choose the exact callback URL, e.g. `https://<your-domain>/`. In Railway **Variables**, set:
   - `EBAY_VERIFICATION_TOKEN`: a newly generated 32–80 character alphanumeric secret.
   - `EBAY_NOTIFICATION_ENDPOINT`: the exact callback URL, including trailing slash if using `/`.
5. In eBay Developer Portal, Production → Application Keys → Notifications, choose Marketplace Account Deletion and enter the same callback URL and token. Save; eBay's GET challenge must validate. The hash is SHA-256 of `challenge_code + verification token + exact endpoint URL`, UTF-8, lowercase hex, returned as JSON `{"challengeResponse":"..."}` with HTTP 200.
6. Verify `GET /health` returns `ok`. POST notifications receive 204 only when valid JSON is received; no payload is saved.

Never put tokens or eBay app keys in Git, issues, chat, or build logs. Store the verification token only in Railway Variables. Railway and eBay may retain infrastructure access logs; this app itself deliberately does not log request URLs or payloads. Check Railway logging settings if strict non-retention is required.

This endpoint only satisfies deletion-notification delivery; it does **not** implement eBay OAuth or listing management. Check eBay's current requirements before production use: https://developer.ebay.com/develop/guides/sell/marketplace-user-account-deletion

## Privacy policy page

`privacy.html` is served by the Railway app at `/privacy`. With the custom domain active, use `https://ebay.hdsapp.co.uk/privacy` in eBay OAuth consent settings. Verify it loads publicly before entering it. Confirm the notice matches actual data handling and replace the contact wording with a real contact method if eBay requires one.

## Custom domain

Planned Railway custom domain: `ebay.hdsapp.co.uk`. Configure this hostname in the Railway service's public networking settings, then add the exact DNS record Railway provides in Cloudflare (normally a CNAME; use Railway's displayed target and any verification record exactly). Keep proxying/DNS settings as Railway instructs until Railway reports the domain active and HTTPS certificate issued.

After activation, set `EBAY_NOTIFICATION_ENDPOINT` in Railway to exactly `https://ebay.hdsapp.co.uk/` and use that same URL as eBay's Marketplace Account Deletion notification endpoint. Set the OAuth privacy policy URL to `https://ebay.hdsapp.co.uk/privacy`. The challenge hash uses the exact endpoint string; mismatched host, path, or trailing slash will fail. After changing the Railway variable, wait for redeployment, then save the same URL in eBay to re-run validation. Check both public URLs before saving eBay settings.
