# SODANGI 2027 — essential setup and admin guide

**Version 2.2 · Updated 24 November 2026**

This is the short, sequential guide for the existing SODANGI 2027 website. It uses the dedicated password sign-in at `/admin` for one trusted owner. Follow the steps in order; do not skip ahead to remove Cloudflare Access until the password sign-in has been verified.

## What already exists

The following are already configured for this project:

- Cloudflare Pages project: `sodangi-2027`
- Public address: `https://sodangi-2027.pages.dev`
- D1 database: `sodangi-cms`
- R2 upload bucket: `sodangi-media`
- GitHub production branch: `main`
- Dedicated mobile-friendly content studio: `/admin`

Do **not** recreate these resources. Do **not** copy `wrangler.example.toml` over the existing `wrangler.toml`.

## Before you start

You need:

1. Access to the Cloudflare account that owns this project.
2. Access to the connected GitHub repository.
3. Node.js 22–24 and npm 10+ on your computer.
4. The campaign’s approved logo, photographs, biography, stories and contact details.

Never put passwords, API tokens or subscriber data in Git, `.dev.vars`, `wrangler.toml`, screenshots, chat messages, or a variable beginning with `VITE_`.

## The essential setup path

### 1. Open the project and verify it builds

Open PowerShell in the folder containing `package.json`.

```powershell
cd "C:\path\to\sodangi-2027"
npm ci
npm run check
```

`npm run check` must finish successfully before deployment. It checks the TypeScript, production build and release safeguards.

### 2. Confirm that you are using the correct Cloudflare account

Run:

```powershell
npx wrangler whoami
npx wrangler d1 list
npx wrangler r2 bucket list
```

Confirm that the account owns `sodangi-cms` and `sodangi-media`. If it does not, stop here. Do not create duplicate resources in another account.

### 3. Apply the password-admin database migration

Run this once against the live D1 database:

```powershell
npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261121_password_admin.sql
```

This only creates the secure session and failed-login tables. It does not replace homepage content.

### 4. Store the three password-admin secrets

All three values belong in the **production** environment of the Pages project. Wrangler prompts for each value so it is not written into shell history.

#### 4.1 Administrator password

Generate a unique password of at least 16 characters in a password manager. Then run:

```powershell
npx wrangler pages secret put ADMIN_PASSWORD --project-name sodangi-2027
```

Paste the password only when Wrangler asks. This is the password you will use at `/admin`.

#### 4.2 Session secret

Generate a separate random session secret. This is **not** the administrator password.

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes) | npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name sodangi-2027
$rng.Dispose()
Remove-Variable bytes,rng
```

The command sends the generated value to Cloudflare without printing it. If it prompts instead, generate a separate 32+-character value in your password manager and paste it there.

#### 4.3 Turn on password mode

Run:

```powershell
npx wrangler pages secret put ADMIN_AUTH_MODE --project-name sodangi-2027
```

When prompted, enter exactly:

```text
password
```

Use lower-case letters with no quotation marks or spaces. Do not enable this mode until the previous two secrets and the database migration are complete.

### 5. Create a fresh production deployment

Pages reads the new secrets on a fresh deployment. With this Git-connected project, commit and push your current work:

```powershell
git status
git add .
git commit -m "Update SODANGI website"
git push origin main
```

If there are no source changes but you only need Pages to read new secrets, use:

```powershell
git commit --allow-empty -m "Redeploy with admin secrets"
git push origin main
```

Open **Cloudflare Dashboard → Workers & Pages → sodangi-2027 → Deployments**. Wait for the new `main` deployment to show **Active**.

### 6. Verify password mode before changing Access

Open this exact address in a private/incognito browser:

```text
https://sodangi-2027.pages.dev/api/admin/auth/config
```

The required response is:

```json
{"mode":"password","passwordConfigured":true}
```

Only continue when both values match exactly.

| What you see | What it means | Fix |
| --- | --- | --- |
| `{"mode":"access","passwordConfigured":false}` | Pages has not read `ADMIN_AUTH_MODE=password` yet. | Check the secret name/value, then create a fresh deployment again. |
| `{"mode":"password","passwordConfigured":false}` | One of the password or session secrets is missing, too short, or in the wrong environment. | Run the relevant secret command again, then deploy again. |
| A Cloudflare Access page or `302` redirect | An old Access policy is still in front of the endpoint. | Do not remove it until the password-mode response is correct; then continue to step 7. |

### 7. Remove the old Access gate only after step 6 succeeds

This step is only needed if `/admin` or `/api/admin/*` was previously protected by Cloudflare Access.

1. Go to **Zero Trust → Access controls → Applications**.
2. Find the application protecting `sodangi-2027.pages.dev/admin` or `/api/admin/*`.
3. Remove those project paths from that application, or delete that application if it is used only for this website.
4. Do **not** use an `Everyone` or `Bypass` policy instead. The password-protected application is now the protection for the administration route.
5. In a private browser, open `/api/admin/auth/config` again. It must still return the JSON shown in step 6, not an Access login page.

Keep any separate preview-only Access policy only if you deliberately need protected preview deployments.

### 8. Sign in and test the content studio

1. Open `https://sodangi-2027.pages.dev/admin` in a private browser window.
2. You should now see an **Administrator password** field, not an Access sign-in notice.
3. Enter the password from step 4.1.
4. In **Website settings**, make one harmless change, save it, and check the public homepage in a new tab.
5. Use **Sign out** in the sidebar. Reload `/admin`; the password form must return.

The session expires after eight hours. The password is never stored in browser storage; the browser receives only a secure, HttpOnly session cookie.

### 9. Manage homepage content

After signing in:

| What you want to change | Where to change it |
| --- | --- |
| Logo, portrait, biography, social links, contact details or homepage text | **Website settings** |
| Images and optional licensed audio | Upload through the relevant Website settings field |
| News, achievements and campaign stories | **News & stories** — save as draft first, then publish after review |
| Facebook Page settings | **Integrations** — leave automatic publishing off until the content policy is approved |

For public content, review English and Hausa text, source claims, names, figures, image rights and mobile display before publishing.

### 10. Keep the site healthy

Before a major announcement:

1. Open the public homepage on a phone and desktop browser.
2. Confirm `https://sodangi-2027.pages.dev/api/site` returns JSON with `"source":"database"`.
3. Check that `/admin` requires the password in a private browser.
4. Back up D1 before bulk changes:

   ```powershell
   New-Item -ItemType Directory -Force .\backups
   npx wrangler d1 export sodangi-cms --remote --output=./backups/sodangi-cms-backup.sql
   ```

Do not commit the `backups` folder. It can contain personal data.

## Essential troubleshooting

| Problem | Most likely cause | Fix |
| --- | --- | --- |
| The public homepage shows preview content | D1 is unavailable to the deployed Function. | Check the active Pages deployment and confirm `/api/site` returns `"source":"database"`. |
| `/admin` says “Cloudflare Access controls this production sign-in” | `ADMIN_AUTH_MODE` has not reached the active deployment. | Repeat steps 4.3–6. |
| `/admin` says password mode is not configured | A required secret or migration is missing. | Repeat steps 3–6. |
| The password form does not appear because Access opens first | An old Access application still intercepts the route. | Complete step 6, then complete step 7. |
| Password is rejected | Incorrect password, or five failed attempts triggered the 15-minute throttle. | Check the password manager entry; wait 15 minutes after repeated failures. |
| `/api/site` returns `503` | The D1 binding is unavailable. | Check the Pages project binding name is exactly `DB` and points to `sodangi-cms`; redeploy. |
| An image or audio upload fails | R2 is not ready, or the file is unsupported/too large. | Confirm `MEDIA` points to `sodangi-media`; use JPG/PNG/WebP/AVIF under 10 MB or MP3/M4A/OGG/WAV under 20 MB. |

## Optional later work

These are not needed to operate the website now:

- **Multiple editors or MFA:** use Cloudflare Access instead of the shared password route. Each editor should have a named identity.
- **Local development:** use root `.dev.vars`, `npm run db:local`, and `npm run cf:local`. Local tokens never work in production.
- **Newsletter:** configure Brevo only after the sender address and privacy process are approved.
- **Facebook sync:** configure a campaign-owned Meta Page token only after the Page permissions and editorial process are approved.
- **Custom domain:** connect and test it after the `pages.dev` site is stable. Re-test password sign-in on the new HTTPS hostname.

## Security rules to keep

- Keep `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, Meta and Brevo values in Cloudflare **Secrets** only.
- Use a password manager; do not share the administrator password in chat, email or screenshots.
- Password mode is for one trusted owner. Move to named Cloudflare Access accounts before adding several editors.
- Never add `LOCAL_ADMIN_TOKEN` to production.
- Keep automatic Facebook publishing off unless a written editorial policy has approved it.

## Official references

- [Cloudflare Pages Functions bindings and environment variables](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Access applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
