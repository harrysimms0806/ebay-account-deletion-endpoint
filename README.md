# eBay seller connector + account-deletion endpoint

Node.js service for eBay Marketplace Account Deletion notifications, a public privacy notice, and a private single-seller OAuth connection. No third-party dependencies.

## Railway configuration

Deploy from repository root; start command is npm start. Attach a Railway persistent volume at /data so the encrypted refresh token survives redeploys. Configure these variables in Railway (never put values in Git or chat):

- EBAY_VERIFICATION_TOKEN: 32–80 alphanumeric chars for deletion-notification challenge.
- EBAY_NOTIFICATION_ENDPOINT: exact public callback URL, e.g. https://ebay.hdsapp.co.uk/ (including trailing slash).
- EBAY_CLIENT_ID: Production App ID / Client ID.
- EBAY_CLIENT_SECRET: Production Cert ID / Client Secret.
- EBAY_RUNAME: exact RuName identifier from eBay Developer Portal, not a URL.
- EBAY_OAUTH_SCOPES: space-separated OAuth scopes. Default is https://api.ebay.com/oauth/api_scope/sell.inventory.
- EBAY_TOKEN_ENCRYPTION_KEY: 64 hex characters (32 random bytes) for AES-256-GCM token encryption.
- EBAY_CONNECTOR_ADMIN_KEY: long random secret to protect connector routes.

In the eBay RuName settings, set Auth Accepted URL to https://ebay.hdsapp.co.uk/oauth/callback and set the exact RuName in EBAY_RUNAME. Ensure the selected OAuth scopes in the authorization request match the scopes approved for the application. In eBay's Marketplace Account Deletion settings use the exact EBAY_NOTIFICATION_ENDPOINT and matching verification token.

## Connect the seller account

After Railway deploys the latest code and variables/volume are in place, visit https://ebay.hdsapp.co.uk/connect. At the browser's HTTP Basic prompt, use any username and EBAY_CONNECTOR_ADMIN_KEY as password. The app redirects to eBay Production consent; approve the requested scopes. eBay returns to /oauth/callback; the app exchanges the code and stores the refresh token encrypted on the volume. Do not send tokens or keys in chat.

Authenticated routes: GET /api/connection checks token refresh; GET /api/inventory reads up to 100 inventory records. Use the admin key as a Bearer token for programmatic calls. This first cut is read-only: it does not yet create/publish listings, modify orders, or provide an OpenClaw-native tool.

## Privacy and DNS

privacy.html is served at https://ebay.hdsapp.co.uk/privacy. The policy must match the actual deployed data handling. Configure ebay.hdsapp.co.uk as a Railway custom domain and add the exact DNS record Railway provides in Cloudflare; wait for HTTPS certificate issuance.

## Verify

GET /health returns JSON {"ok":true}. Never commit credentials, OAuth codes, access tokens, refresh tokens, verification tokens, or admin keys. The app does not log OAuth codes or tokens.
