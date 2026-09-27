# eBay Marketplace Account Deletion endpoint (Railway)

Minimal Node.js service; no third-party packages or database. It handles eBay's GET challenge and acknowledges POST notifications without logging or persisting the payload/user data.

## Deploy
1. Put this folder in a private GitHub repository (never commit secrets), or deploy via Railway's supported source workflow.
2. Create a Railway service from the repository. It runs `npm start` and listens on Railway's `PORT`.
3. Generate a public HTTPS domain in Railway Networking.
4. In Railway Variables set `EBAY_VERIFICATION_TOKEN` to a new 32–80 character alphanumeric secret, and `EBAY_NOTIFICATION_ENDPOINT` to the exact public URL eBay will call (e.g. `https://<domain>/`). Endpoint value must match exactly. Do not put the token in code, Git, or Discord.
5. Configure that same URL and token on eBay Production > Application Keys > Notifications > Marketplace Account Deletion. eBay will call `GET /?challenge_code=...`; confirm validation succeeds.
6. Check `GET /health` returns `ok`; test POST returns 204 and does not retain payloads.

This is only for deletion notifications. It does not connect eBay OAuth or manage listings. Before relying on it, confirm implementation details against eBay's current official guide: https://developer.ebay.com/develop/guides/sell/marketplace-user-account-deletion
