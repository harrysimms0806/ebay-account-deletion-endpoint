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
