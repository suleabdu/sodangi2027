# SODANGI 2027 — Facebook Page integration setup (24 November 2026)

This guide applies to the **existing** production Cloudflare Pages project `sodangi-2027`, D1 database `sodangi-cms`, admin route `/admin`, and current code in `functions/_facebook.ts`.

## Important: two different pieces of information

- **Facebook Page ID**: the numeric ID for the official Page. Enter it in **Admin → Integrations → Facebook Page ID**.
- **Facebook Page Access Token**: a private credential issued by Meta. Store it as the exact Cloudflare Pages production **Secret** named `FB_PAGE_ACCESS_TOKEN`. The current code does **not** read `FB_ACCESS_TOKEN`. Never paste the token into the public site, the Page URL field, GitHub or chat.

The Page URL must be the official HTTPS address, e.g. `https://www.facebook.com/YourRealPageName`; do not use `fb.me`, `fb.watch`, a Facebook post URL or a Meta developer dashboard URL. The current backend only accepts hostnames `facebook.com`, `www.facebook.com` and `m.facebook.com`.

## 1. Obtain an authorised Page token from Meta

1. Confirm the campaign owns or has permission to manage the official Facebook **Page** and that your Meta account has adequate Page access. Access to an unrelated personal profile is not enough.
2. Go to https://developers.facebook.com/apps/ and sign in with the authorised Meta account. Create or select a Meta developer app supporting Facebook Login/Pages API access, completing any required app setup.
3. Open https://developers.facebook.com/tools/explorer/ (Graph API Explorer). Select your app.
4. Select a **User access token** and grant only the Page-reading permissions needed to discover and read your own Page, normally `pages_show_list` and `pages_read_engagement`. Depending on Page content and Meta's current API controls, `pages_read_user_content` may be needed. Meta may require advanced access, app review or business verification for some use cases.
5. With the newly authorised **User** token selected in Graph API Explorer, submit:

   `GET /me/accounts?fields=id,name,access_token,tasks`

6. Locate the **official Sodangi Page** in the response. Record its numeric `id` for the admin Page ID field. Securely copy that Page object's `access_token` for Cloudflare. This is a **Page token**; do not substitute the app token or user token.
7. Select the Page token in Explorer and verify the Page can be read with `GET /{PAGE_ID}?fields=id,name`, then try `GET /{PAGE_ID}/feed?fields=id,message,permalink_url,created_time&limit=5`.
8. Use https://developers.facebook.com/tools/debug/accesstoken/ privately to inspect the token type, app, expiration and granted permissions. Do not share the actual token or screenshots containing it. Check expiry and rotation regularly; never assume a particular token lasts forever.

Meta reference: https://developers.facebook.com/docs/graph-api/guides/explorer/

## 2. Configure Cloudflare Pages Production Secret

Option A — **Cloudflare dashboard**:

1. Sign into https://dash.cloudflare.com/ and select the account that owns the existing Pages project.
2. Open **Workers & Pages → sodangi-2027 → Settings → Variables and Secrets** (the location may be presented under Production settings).
3. Select **Production**, choose **Add**, and select **Secret/Encrypt** rather than plain-text text.
4. Name it exactly `FB_PAGE_ACCESS_TOKEN`. Paste only the Page access token from Meta. Save it.
5. Create a fresh **production deployment** of the existing `main` branch so Pages Functions receive the new secret.
6. Do not put the token in `VITE_*` variables, `wrangler.toml`, GitHub, or an admin text field.

Option B — **PowerShell CLI**, from your local project directory:

```powershell
npx wrangler login
npx wrangler pages secret put FB_PAGE_ACCESS_TOKEN --project-name sodangi-2027
```

When Wrangler prompts, paste the Page token. Never include the token itself in the command. Then create a new production deployment. If no source change exists in a Git-connected project:

```powershell
git commit --allow-empty -m "Redeploy after Facebook secret configuration"
git push origin main
```

Note: the Pages secret and the optional **scheduled Worker secret are separate bindings**. Setting one does not configure the other.

Cloudflare reference: https://developers.cloudflare.com/pages/functions/bindings/

## 3. Finish the public site admin settings

1. Open `https://sodangi-2027.pages.dev/admin` and sign in.
2. Select **Integrations → Facebook Page feed**.
3. Set **Facebook Page ID** to the numeric ID from the Meta `/me/accounts` response.
4. Set **Official Facebook Page URL** to the actual Page URL beginning with `https://www.facebook.com/`.
5. Enable **Show Facebook content in the website feed**. Leave **Publish imported posts automatically** OFF initially. Pick a sync frequency.
6. Click **Save integration**, then **Refresh status**.
7. You should see **Meta credential stored securely**. This status confirms only that a secret is present, **not** that the Meta token is valid.
8. Click **Sync now**. A successful response will show imported/existing counts. New posts will be in **draft** status when auto-publish is off. Review and publish the approved drafts in **News & stories**.
9. If sync fails, examine **Sync activity → Last error** before replacing the token.

The code reads the exact server-side key `env.FB_PAGE_ACCESS_TOKEN` and the Page ID from D1. It fetches `/{PAGE_ID}/feed` through Meta Graph API v27.0.

## 4. Optional recurring background synchronisation

**Manual “Sync now” works without the scheduled Worker.** To enable recurring automatic checks, the repository also includes a separate Worker in `workers/facebook-sync.ts`.

A previous `workers/wrangler.toml` mistakenly merged two projects and used a D1 database ID different from the actual Pages project. The corrected configuration on this patch branch contains only the scheduled Worker and binds the same D1 ID as the root `wrangler.toml`.

After reviewing/merging this patch and pulling the updated code:

```powershell
npx wrangler deploy --config workers/wrangler.toml
npx wrangler secret put FB_PAGE_ACCESS_TOKEN --config workers/wrangler.toml
```

Paste the same authorised Page token when prompted. The Worker is scheduled every 15 minutes and respects the interval selected in the admin database settings. Monitor logs from the Cloudflare dashboard for `sodangi-facebook-sync`.

**Do not use `npx wrangler deploy` on the repository root**: this project is a Pages app, and the scheduled Worker needs its own config.

## 5. Troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| “Meta credential not configured” | `FB_PAGE_ACCESS_TOKEN` absent in *production Pages*, wrong spelling, or new deployment not created | Set the secret exactly and redeploy production |
| “Facebook Page URL must be an HTTPS Facebook Page URL” | URL omitted `https://`, wrong host (e.g. `fb.me`), or entered a post/redirect link | Paste official `https://www.facebook.com/YourPage` address |
| “Facebook Page ID is invalid” | Page username or full URL entered as ID | Copy the numeric `id` returned by `/me/accounts` |
| Token present, “Sync now” fails HTTP 401/400 | Expired/wrong token, wrong Page ID or unsupported requested field | Debug in Meta tools; obtain an authorised Page token and test fields |
| Token present, “Sync now” fails HTTP 403 | App has insufficient Page access or permissions | Review `pages_read_engagement`, Meta permissions/app review and Page role |
| “Sync now” works, automatic updates do not | Scheduled Worker not deployed or its separate secret missing | Deploy Worker with corrected config and add Worker secret |
| No new posts but sync succeeded | Meta returns no Page-owned accessible posts or items already exist | Check Explorer endpoint, review imported/existing counters, confirm drafts |
| Integration settings respond with 503 | Facebook integration SQL migration missing | Back up D1 and apply `database/migrations/20261118_facebook_integration.sql` once |

## Security and editorial review

The integrated importer sets new posts to **draft** by default, preserves manually edited/translated existing posts and does not write Meta credentials to the browser. Use an authorised Page token, never a personal password. Replace/revoke the credential immediately if leaked.

The `/feed` endpoint does not automatically cover every Reel or Live video; those media may need distinct Meta endpoints, app permissions or official embeds.

Only authorised project administrators should hold Cloudflare, Meta and GitHub credentials.
