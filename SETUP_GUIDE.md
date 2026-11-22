# SODANGI 2027 — beginner setup, administration and launch guide

**Version 2.1 · Updated 22 November 2026**

This guide takes a first-time administrator from an unzipped project folder to a protected live website. Follow the steps in order. Do not skip the security steps simply because the public pages appear to work: the content studio can change public information, so it must be protected before anyone is invited to use it.

> **Before you begin:** this project is source code, not a public sign-in system by itself. You need authority to use the campaign's Cloudflare account, domain, approved content, and (only if desired) Meta and Brevo accounts.

## Contents

1. [What you are setting up](#1-what-you-are-setting-up)
2. [Choose the right path](#2-choose-the-right-path)
3. [What you need](#3-what-you-need)
4. [Set up the project on your computer](#4-set-up-the-project-on-your-computer)
5. [Preview the website locally](#5-preview-the-website-locally)
6. [Run the full CMS locally](#6-run-the-full-cms-locally)
7. [Create the Cloudflare resources](#7-create-the-cloudflare-resources)
8. [Protect the admin route before sharing the URL](#8-protect-the-admin-route-before-sharing-the-url)
9. [Prepare the database](#9-prepare-the-database)
10. [Deploy the website](#10-deploy-the-website)
11. [Use the content studio](#11-use-the-content-studio)
12. [Optional services](#12-optional-services)
13. [Connect a custom domain](#13-connect-a-custom-domain)
14. [Test before launch](#14-test-before-launch)
15. [Operate, back up and recover](#15-operate-back-up-and-recover)
16. [Troubleshooting](#16-troubleshooting)

## 1. What you are setting up

The package contains a mobile-first public information website and a private content studio at `/admin`.

| Part | What it does | Who should use it |
| --- | --- | --- |
| Public website | Shows biography, SHARES agenda, DIGITs, news, media, contact and privacy content in English and Hausa. | Visitors |
| Content studio | Lets authorised editors update the logo, imagery, biography, stories, programme content, contact details, bilingual copy, uploaded media and Facebook settings. | Approved administrators only |
| Cloudflare Pages | Hosts the public site and the server-side API. | Technical administrator |
| Cloudflare D1 | Stores website settings, stories, translations, newsletter records, integration settings and audit history. | Technical administrator / application |
| Cloudflare R2 | Stores images and optional licensed audio uploaded through the studio. | Optional, but required for uploads |
| Cloudflare Access | Recommended sign-in for several editors: named accounts, MFA and a clear audit identity. | Recommended for teams |
| Built-in password sign-in | An optional, separate `/admin` sign-in for one trusted owner who does not want to configure Zero Trust policies. | One trusted owner only |
| Optional Facebook Worker | Checks the official Facebook Page on a schedule and imports new posts for editorial review. | Technical administrator |

### A few words used in this guide

- **Terminal:** the command window used to run the lines in grey code blocks. Windows users can use PowerShell.
- **Project root:** the folder containing `package.json`, `src`, `functions` and this file.
- **D1 database:** Cloudflare's hosted SQL database. This project calls it `sodangi-cms` in the examples.
- **R2 bucket:** Cloudflare's file storage. This project calls it `sodangi-media` in the examples.
- **Binding:** a safe name the code uses to reach a Cloudflare resource. This project needs `DB` for D1 and, when uploads are enabled, `MEDIA` for R2.
- **Secret:** a private value such as an API key or Meta token. Secrets never belong in Git, browser JavaScript, screenshots or email.
- **Production:** the public live site. **Local** means only on your own computer.

## 2. Choose the right path

First decide which description fits your situation. The difference matters because a database with real editorial work must not be reseeded.

| Your situation | Follow | Important rule |
| --- | --- | --- |
| You have never deployed this website and the D1 database is empty or new. | Every section, then the **new database** path in section 9. | Start with `database/schema.sql`. |
| A previous version is already live and D1 contains edits, subscribers or published stories. | Every section, then the **existing database** path in section 9. | Back up first. Apply migrations; do **not** replace the database with the starter seed. |
| You only want to look at the design on your computer. | Sections 3–5 only. | The `npm run dev` preview does not include the real CMS API. |

The main deployment instructions below use the simple **Wrangler command-line route**. There is a separate optional GitHub route later. Choose one production deployment method at first; using both at the same time can make it unclear which deployment is live.

## 3. What you need

### Required for a live site

1. A Windows 10/11, macOS or Linux computer.
2. Node.js **22, 23 or 24** and npm **10 or later**. Node 24 is the project recommendation (`.nvmrc` contains `24`).
3. A Cloudflare account with permission to create and manage Pages and D1 resources (and R2 if uploads are needed).
4. Access to the campaign's approved text, images, logo, contact details and social URLs.

### Optional, depending on features you want

- An R2-enabled Cloudflare account for image/audio uploads. Cloudflare may require billing verification before R2 can be used.
- A custom domain, such as `example.org`.
- A Brevo account for newsletter confirmation emails.
- A Meta developer app and authority over the official Facebook Page for automatic Facebook import.
- A GitHub account if you want automatic deployments from a repository.

### Stop here if any of these are true

- You do not control the Cloudflare account that will own the site.
- You do not have permission to publish campaign content or use the candidate's image/logo.
- You only have a personal Facebook token rather than an approved Page access token.
- You are about to copy a real secret into a source file, a chat, email, or a `VITE_*` browser variable.

Ask the account owner or technical administrator to resolve that first.

## 4. Set up the project on your computer

### Step 4.1 — Put the project in a safe folder

Extract or copy the project to a normal working folder, for example:

```text
C:\projects\sodangi-2027
```

Open PowerShell (Windows) or Terminal (macOS/Linux), then move into that folder:

```powershell
cd "C:\projects\sodangi-2027"
```

On macOS/Linux, use the matching path, for example `cd ~/projects/sodangi-2027`.

You are in the correct folder when this command lists `package.json`, `src`, `functions` and `database`:

```powershell
Get-ChildItem
```

### Step 4.2 — Check Node and npm

Run:

```powershell
node --version
npm --version
```

Node must report a version from 22 through 24; npm should be 10 or newer. If it does not, install a current Node LTS release from [nodejs.org](https://nodejs.org/) and reopen the terminal before continuing.

### Step 4.3 — Install the exact project dependencies

Run:

```powershell
npm ci
```

`npm ci` uses the locked dependency versions from `package-lock.json`. It is more repeatable than `npm install` for this project. It needs an internet connection the first time.

### Step 4.4 — Run the pre-flight check

Run:

```powershell
npm run check
```

Success means the TypeScript check, production build, syntax check and release checks all finish without an error. Do not deploy while this command fails.

If it fails, copy the first error message and resolve it before moving on. Common fixes are in [Troubleshooting](#16-troubleshooting).

### Step 4.5 — Know which files are safe to change

| File | What to do |
| --- | --- |
| `.dev.vars` | Create only for local development. It is ignored by Git. Never upload it. |
| `wrangler.local.toml` | Checked-in local-only D1 configuration used by `npm run db:local`; `npm run cf:local` uses the matching local binding. It never connects to campaign resources. |
| `wrangler.toml` | This repository already includes the live-project configuration. Verify the resource IDs belong to the intended Cloudflare account; do not copy the example file over it. It may contain resource IDs but must contain no secret values. |
| `workers/wrangler.toml` | Only edit if you enable scheduled Facebook sync. Replace its D1 placeholder before deploying that Worker. |
| `database/schema.sql` | Use only for a brand-new D1 database. Do not manually edit live data here. |
| `database/migrations/*.sql` | Use for an existing live database, after a backup. |

The repository ignores `node_modules`, `dist`, `.wrangler`, `.dev.vars`, `.env`, `backups` and build/test output. Do not add those generated or sensitive files to Git.

## 5. Preview the website locally

This is the quickest way to inspect the look and responsive layout. It is not the complete application.

1. In the project root, run:

   ```powershell
   npm run dev
   ```

2. Open the URL shown in the terminal, normally <http://localhost:5173>.
3. Resize the browser window or use browser device emulation to check phone, tablet and desktop layouts.
4. Press `Ctrl+C` in the terminal when you are finished.

You may see a preview message because this Vite-only server does not run Cloudflare D1, R2 or Pages Functions. That is expected. Use the next section when you need to test `/admin`, uploads, stories or API-backed content.

## 6. Run the full CMS locally

This creates local-only data and starts the same type of Pages Functions API used in production. It does **not** modify the cloud database.

### Step 6.1 — Create your local-only settings file

In PowerShell:

```powershell
Copy-Item .env.example .dev.vars
notepad .dev.vars
```

On macOS/Linux:

```bash
cp .env.example .dev.vars
nano .dev.vars
```

Set at least these values in `.dev.vars`:

```env
ENVIRONMENT=development
LOCAL_ADMIN_TOKEN=put-a-long-unique-local-token-here
SITE_ORIGIN=http://localhost:8788
```

This file must be named exactly `.dev.vars` and sit in the **project root**, beside `package.json`—not in `workers/`. Use plain `KEY=value` lines: do not add trailing backslashes and do not escape `http://`. Use a password manager or secure generator to make the local token long and unique. It is only for your computer; do not reuse a production password or paste it into a ticket/chat.

### Step 6.2 — Create the local database

Run:

```powershell
npm run db:local
```

Expected result: Wrangler reports that it executed `database/schema.sql` against the local `DB` database. This is separate from the cloud database and is safe to recreate during development.

### Step 6.3 — Start the full local application

Run:

```powershell
npm run cf:local
```

Wait for Wrangler to print its **Ready** message, then open the URL shown by Wrangler, normally <http://localhost:8788>, in your browser. The command deliberately keeps the terminal busy and does not open a browser by itself. Then:

1. Open `/admin`.
2. Expand **Developing locally with Wrangler?**.
3. Enter the exact `LOCAL_ADMIN_TOKEN` from `.dev.vars`.
4. Confirm that the Overview page loads.

When `/admin` first opens, it checks the protected API before you have entered a local token. A few `401 Unauthorized` lines in the terminal at that moment are expected. After selecting **Use local token**, the next admin API calls should succeed; if they do not, use the local-admin troubleshooting row in section 16.

The local token is accepted only for localhost while `ENVIRONMENT=development`. It is deliberately rejected by production. Stop the server with `Ctrl+C` when finished.

## 7. Create the Cloudflare resources

The commands below assume you keep the recommended names. Keeping them avoids having to change package scripts:

- Pages project: `sodangi-2027`
- D1 database: `sodangi-cms`
- R2 bucket: `sodangi-media`

If a name is already taken, choose another name and replace it consistently in `wrangler.toml`, `workers/wrangler.toml` (if used), and every command that names the resource.

### Step 7.1 — Sign in with Wrangler

Run:

```powershell
npx wrangler login
npx wrangler whoami
```

The first command opens a browser sign-in window. The second must show the campaign-owned Cloudflare account. Stop if it shows a personal or wrong account.

### Step 7.2 — Create the D1 database

Run:

```powershell
npx wrangler d1 create sodangi-cms
```

Cloudflare prints a `database_id`. Copy it somewhere safe temporarily. It is an identifier, not a secret, but you still need the exact value.

### Step 7.3 — Create the R2 bucket (recommended)

Run:

```powershell
npx wrangler r2 bucket create sodangi-media
```

R2 enables protected image and audio uploads in the content studio. You can deploy without it, but upload controls will report that media storage is not configured.

### Step 7.4 — Create your Cloudflare configuration file

This repository already includes `wrangler.toml` for the configured Pages project. **Do not copy `wrangler.example.toml` over it**—that would erase the known database and bucket bindings.

1. Open `wrangler.toml` in a text editor.
2. Run `npx wrangler d1 list` and compare the listed `sodangi-cms` ID with the `database_id` in `wrangler.toml`.
3. Run `npx wrangler r2 bucket list` and confirm that `sodangi-media` is the intended upload bucket.
4. Confirm that `SITE_ORIGIN` exactly matches the public Pages URL, for example `https://sodangi-2027.pages.dev`.
5. Change a value only if you have deliberately created a different campaign resource in the correct Cloudflare account. Keep the binding names exactly `DB` and `MEDIA`.

Leave `ENVIRONMENT = "production"` in `wrangler.toml`. Do not add `LOCAL_ADMIN_TOKEN`, administrator passwords, Meta tokens, Brevo keys or Cloudflare API tokens to this file.

### Step 7.5 — Create the Pages project

Run:

```powershell
npx wrangler pages project create sodangi-2027 --production-branch main
```

If you used another project name, use it instead. Cloudflare will reserve a Pages hostname such as `https://sodangi-2027.pages.dev`. Put that hostname into `SITE_ORIGIN` in `wrangler.toml`, then save the file.

## 8. PROTECT THE ADMIN ROUTE BEFORE SHARING THE URL

Complete this section before anyone uses the content studio. The public homepage should remain public; only the private administration screen and its API need sign-in.

> **Do not skip this section.** Hiding `/admin` from the menu does not secure it. The application rejects unauthenticated edit requests, but you must choose and complete one protected production sign-in route below.

### Step 8.0 — Choose one protected sign-in route

Choose **one** option before changing variables. Both keep the public homepage public and protect the content-changing API. Do not enable both routes at the same time.

| Choose this when… | Use this route | What it gives you |
| --- | --- | --- |
| More than one editor needs access, or you need named identities and MFA. | **Cloudflare Access** — complete steps 8.1–8.10. | A separate signed-in account per editor and a meaningful audit identity. This remains the recommended production choice for a team. |
| One trusted owner manages all content and wants a simpler `/admin` password screen instead of Zero Trust policies. | **Built-in password sign-in** — complete steps 8.1–8.3 and 8.3A, then skip steps 8.4–8.10. | A dedicated password page backed by a server-only Cloudflare secret, an 8-hour secure session, CSRF protection and login throttling. |

Password mode is not an open or public admin page. It still needs the Pages project, D1 database, a database migration and three Cloudflare secrets. It is less suitable than Access for a team because its audit trail identifies the shared account as `password-admin`, not an individual person.

### Step 8.1 — Prepare before changing your sign-in route

1. Confirm that the public Pages site has a working hostname, such as `https://sodangi-2027.pages.dev` or the approved campaign domain.
2. Keep one Cloudflare account owner as a **break-glass administrator**. That person must be able to open the Cloudflare dashboard and undo a Pages variable or Access mistake.
3. Write down every hostname that can reach the site. Examples: the Pages hostname, `www.example.org`, `example.org`, and any alternate domain. Each reachable hostname must be tested later.
4. If you chose Access, decide which identity provider editors will use—typically Google, Microsoft, an organisation SSO provider, or email one-time PIN. Do not invite editors until the policy is saved and tested.

### Step 8.2 — Confirm the resource bindings

In the Cloudflare dashboard, open **Workers & Pages → sodangi-2027 → Settings**. Locate the bindings/resources area and confirm or add:

| Binding name | Resource type | Select |
| --- | --- | --- |
| `DB` | D1 database | `sodangi-cms` |
| `MEDIA` | R2 bucket | `sodangi-media` (if you created it) |

The names must be exactly `DB` and `MEDIA`, because those are the names used by the application. If you use command-line deployment, `wrangler.toml` also declares the same bindings. Do not create conflicting bindings with different resource names in the dashboard. After adding or changing a binding in the dashboard, create a fresh deployment before testing it.

### Step 8.3 — Set basic production variables and any services you have already chosen

Open **Workers & Pages → sodangi-2027 → Settings → Variables and Secrets**. Set the production values below. Dashboard wording changes occasionally; look for a production environment selector and variables/secrets section.

| Key | Value | Required? | Keep secret? |
| --- | --- | --- | --- |
| `ENVIRONMENT` | `production` | Yes | No |
| `SITE_ORIGIN` | Exact public origin, e.g. `https://sodangi-2027.pages.dev` | Yes | No |
| `ACCESS_TEAM_DOMAIN` | Your Zero Trust team hostname, e.g. `campaign.cloudflareaccess.com` | Only for the Access route | No |
| `ACCESS_AUD` | The exact Application Audience (AUD) Tag from the Access application | Only for the Access route | No |
| `BREVO_API_KEY` | Brevo API key | Only for newsletter | **Yes** |
| `BREVO_LIST_ID` | Confirmed-subscriber list ID | Only for newsletter | Prefer secret/config |
| `MAIL_FROM` | Verified sender email | Only for newsletter | No |
| `FB_PAGE_ACCESS_TOKEN` | Meta Page access token | Only for Facebook sync | **Yes** |

For a Wrangler CLI deployment, the matching non-secret `ENVIRONMENT` and `SITE_ORIGIN` values in `wrangler.toml` are part of the deployment configuration. For a Git-integrated project, enter the same values in the dashboard. If both places are used, keep them identical; conflicting values make problems hard to diagnose.

Leave `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` blank until you create the Access application in steps 8.4–8.8; step 8.8 shows exactly where to copy them from. If you chose password mode, leave both blank. Leave newsletter and Facebook values unset until you intentionally enable those services.

Never add `LOCAL_ADMIN_TOKEN` to a production environment. Never put a secret in a variable beginning `VITE_`; Vite exposes those values to browser code.

For a secret, you can use the dashboard or an interactive command such as:

```powershell
npx wrangler pages secret put FB_PAGE_ACCESS_TOKEN --project-name sodangi-2027
```

Wrangler prompts for the value. Paste it only into that prompt, then press Enter. Do not append it to the command line or save it in a shell history file.

### Step 8.3A — Use the built-in password sign-in (one trusted owner)

Follow this route only if one trusted owner will operate the dashboard and you deliberately do **not** want to create Cloudflare Access policies. It removes the Zero Trust policy work; it does not make `/admin` public.

1. **Apply the small database migration first.** From the project root, run:

   ```powershell
   npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261121_password_admin.sql
   ```

   Wait for Wrangler to report success. This adds only the hashed session and login-throttle tables. It does not change homepage content.

2. **Create a strong administrator password privately.** Use a password manager to generate a unique password of at least 16 characters. Do not reuse a personal, email, Facebook or Cloudflare password.

3. **Store that password as a Pages secret.** Run this command, wait for the prompt, then paste the password only into the prompt:

   ```powershell
   npx wrangler pages secret put ADMIN_PASSWORD --project-name sodangi-2027
   ```

   Press Enter. Do not put the password in `.dev.vars`, `wrangler.toml`, Git, a screenshot or this guide.

4. **Create a separate session secret.** This value is not the administrator password. The following PowerShell commands generate 48 random bytes and send them directly to Wrangler without printing the value:

   ```powershell
   $bytes = New-Object byte[] 48
   $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
   $rng.GetBytes($bytes)
   [Convert]::ToBase64String($bytes) | npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name sodangi-2027
   $rng.Dispose()
   Remove-Variable bytes,rng
   ```

   If Wrangler instead asks for a value, generate a different 32+-character random value in your password manager and paste it at that prompt. Never use the administrator password again as the session secret.

5. **Turn on password mode only after both secrets are stored.** Run:

   ```powershell
   npx wrangler pages secret put ADMIN_AUTH_MODE --project-name sodangi-2027
   ```

   At the prompt, type exactly:

   ```text
   password
   ```

   The exact lower-case word matters. Do not set this value first: an enabled mode without the other two secrets correctly fails closed and no one can sign in.

6. **Create a fresh production deployment.** Follow section 10 after the current code and migration are in place. A Git-connected Pages project can use the next push to `main`; otherwise run the deployment command in section 10. Wait until Pages shows the deployment as successful.

7. **Remove a previous Cloudflare Access edge gate, if one exists.** Password mode cannot display its own sign-in form while an old Access application is still redirecting `/admin` or `/api/admin/*` to Cloudflare Access.

   - First confirm that step 6 completed and both password secrets are stored. Do **not** remove Access before password mode is ready.
   - In **Zero Trust → Access controls → Applications**, find only the application whose public hostname/path protects this project’s `/admin` or `/api/admin/*` routes.
   - Delete that application, or remove those project paths from it, then save. Keep a separate preview-only application only if you deliberately use protected previews.
   - Do **not** create an `Everyone` or `Bypass` policy as a workaround. The application’s password session is now the protection for the public admin route.
   - In a private browser, open `https://YOUR-SITE/api/admin/auth/config`. It must show a small JSON response, not a Cloudflare Access page or a `302` redirect.

8. **Test it in a private browser window.** Open `https://YOUR-SITE/admin`. You should see an administrator-password form. Enter the password once. The dashboard should load and the public homepage must remain public.

9. **Test sign-out.** Use **Sign out** in the dashboard sidebar, then reload `/admin`. The password form must return. The browser session expires after eight hours even if you forget to sign out.

10. **Keep the password route limited.** Anyone with this shared password has full edit access and appears in the audit trail as `password-admin`. If you later add editors, need MFA, or need to know who made each change, switch to the Access route below instead.

Password mode uses a `Secure`, `HttpOnly`, `SameSite=Strict` browser cookie, a server-side D1 session, a per-session CSRF token, and a five-failure/15-minute login throttle. It is intended for the HTTPS production site. Continue using `LOCAL_ADMIN_TOKEN` only for localhost development.

### Step 8.4 — Create or open your Cloudflare Zero Trust team

1. Sign in to the Cloudflare dashboard with the campaign-owned account.
2. Open **Zero Trust**. If Cloudflare asks you to create a team, complete that short setup.
3. Choose a team name carefully. Cloudflare creates an Access team domain such as:

   ```text
   campaign.cloudflareaccess.com
   ```

4. Save the team domain somewhere private. Later, this exact hostname—without `https://`, a path or a trailing slash—becomes `ACCESS_TEAM_DOMAIN`.
5. In Zero Trust, open **Settings → Authentication** (or **Authentication → Login methods**, if the dashboard uses that wording). Enable the sign-in method your editors will use. A small team can use email one-time PIN; an organisation can use its approved Google, Microsoft or SSO provider.

For the Access route, do not use a shared campaign password. Each editor needs their own identity so the Access policy and CMS audit trail remain meaningful.

### Step 8.5 — Choose the correct Access setup for your hostname

This is the Access route. Cloudflare handles a Pages-provided `*.pages.dev` hostname differently from a campaign-owned custom domain. Choose the row that matches the URL you will give to administrators.

| Administrator URL | Where to begin | Important note |
| --- | --- | --- |
| `https://YOUR-PROJECT.pages.dev/admin` | **Workers & Pages → your project → Settings → General → Enable access policy** | Pages' built-in switch protects preview deployments first. Use **Manage** on the generated policy, then configure the production Pages hostname and the paths in step 8.6. |
| `https://www.example.org/admin` or another campaign-owned domain | **Zero Trust → Access controls → Applications → Create new application → Self-hosted and private** | Select **Add public hostname**, then choose the campaign domain and add the paths in step 8.6. |
| A preview address such as `HASH.YOUR-PROJECT.pages.dev/admin` | Treat as a separate preview-security task | Preview URLs are public by default and can receive a separate Access application/AUD. Do not use the admin studio from previews until it has been deliberately configured and tested. |

For a `pages.dev` production URL, Cloudflare's Pages flow may first create an application using a wildcard subdomain for previews. Select **Manage**, open the project application under **Zero Trust → Access controls → Applications**, choose **Configure**, and remove the wildcard when Cloudflare instructs you to target the exact production subdomain. Return to Pages settings and re-enable preview access only if you also need protected previews.

> **Keep the public site public:** do not protect the empty path, the site root, or `/*` unless you intentionally want every visitor to sign in. This project needs only the three administration destinations below.

### Step 8.6 — Add the exact protected paths

Create **one Access application** for the administration experience, then add these destinations to that same application for each administrator hostname:

| Hostname example | Path to add | Why it is needed |
| --- | --- | --- |
| `sodangi-2027.pages.dev` | `/admin` | Protects the exact studio route. |
| `sodangi-2027.pages.dev` | `/admin/*` | Protects future/nested studio paths. A wildcard does not cover `/admin` itself. |
| `sodangi-2027.pages.dev` | `/api/admin/*` | Protects every editing, upload, audit and integration API endpoint. |

For example, the completed destinations are:

```text
https://sodangi-2027.pages.dev/admin
https://sodangi-2027.pages.dev/admin/*
https://sodangi-2027.pages.dev/api/admin/*
```

If a campaign domain is also used, add the same three paths for that hostname, for example `https://www.example.org/admin` and `https://www.example.org/api/admin/*`.

Use one application wherever Cloudflare permits multiple destinations, because one application has one **Audience (AUD) tag**. The website validates that exact audience before accepting an edit. Do not create separate UI and API applications with different AUD tags; a user may appear signed in but the API will correctly return `401 Authentication required`.

If the Pages/Access interface does not let you put the required production hostname and paths into one consistent application, stop and ask the Cloudflare account owner or technical administrator to resolve it before sharing `/admin`. Do not solve this by protecting the entire public website or by weakening the API checks.

### Step 8.7 — Create a least-privilege editor policy

While creating or editing the application, choose **Add a policy** or **Create new policy** and use these settings:

| Field | Beginner-safe choice |
| --- | --- |
| Policy name | `Sodangi content editors` |
| Action | **Allow** |
| Include rule | **Emails** → enter each approved editor's individual email address, or use a tightly managed identity-provider group. |
| Exclude rule | Leave empty unless a named person must be blocked. |
| Everyone / all users | Do **not** use this. It would give every eligible identity full CMS editing authority. |
| Bypass | Do **not** add a bypass policy for `/admin` or `/api/admin/*`. |
| Session duration | Start with a short, practical session such as 8 hours or 1 day; require reauthentication afterwards. |
| MFA | Turn it on in the identity provider or Access settings where available. |

Cloudflare Access is deny-by-default: only people who match this Allow policy can obtain the token that the API accepts. This project currently treats every successfully authorised editor as a full administrator, so keep the list small and reviewed.

### Step 8.8 — Copy the two values the website needs

After saving the Access application:

1. In **Zero Trust → Access controls → Applications**, find the application you just created.
2. Select **Edit**.
3. Open **Additional settings** and copy the **Application Audience (AUD) Tag**. Do not copy the application name or ID by mistake.
4. Return to **Workers & Pages → sodangi-2027 → Settings → Variables and Secrets** and select the **Production** environment.
5. Add or update these values:

   | Variable | Exact value format |
   | --- | --- |
   | `ACCESS_TEAM_DOMAIN` | `campaign.cloudflareaccess.com` — hostname only, no `https://`, no path and no ending `/`. |
   | `ACCESS_AUD` | Paste the complete Audience (AUD) Tag from the same Access application. |
   | `ENVIRONMENT` | `production` |

6. Confirm that `LOCAL_ADMIN_TOKEN` is **not** present in the production environment.
7. Save the variables and create a fresh production deployment. Changing a Pages variable does not repair an already-running deployment by itself.

The application validates the Access JWT header against Cloudflare's signing keys, the team domain, the expected AUD tag and the RS256 algorithm. A mistyped team domain, stale AUD tag, missing token or wrong application therefore fails closed with `401`.

### Step 8.9 — Test the Access route before telling anyone the admin URL

Perform all four tests. Do not rely only on a successful login from the Cloudflare account owner.

1. **Public visitor test:** in a normal browser, open the public homepage. It must remain public and must not show a sign-in screen.
2. **Unauthorised test:** open a private/incognito window, make sure no allowed editor account is signed in, then visit:

   ```text
   https://YOUR-HOST/admin
   https://YOUR-HOST/api/admin/status
   ```

   Expected result: Cloudflare Access shows a login page or a clear access-denied page. You must not receive editable CMS data.

3. **Allowed-editor test:** in a separate private window, sign in with an email listed in the Allow policy. `/admin` must load the Overview dashboard. Make one harmless change, save it, confirm it appears publicly, then change it back.
4. **Direct API test:** while signed in as the allowed editor, open `https://YOUR-HOST/api/admin/status`. Expected result: JSON data with HTTP `200`, not `401` or `403`.

Repeat the unauthorised and allowed-editor tests for every reachable hostname, including `pages.dev`, the custom domain, `www`, and aliases. Access rules are hostname-specific.

### Step 8.10 — Protect Access previews and recover safely

- Pages preview URLs are separate from the production hostname and are public by default. In **Workers & Pages → project → Settings → General**, enable the preview access policy if previews contain sensitive work.
- A preview policy may have a different Audience tag. Until the application has been deliberately configured to accept that audience, do not use `/admin` on a preview URL; edit content only on the tested production hostname.
- Record the Access application name, protected hostnames/paths, allowed editor emails, team domain, AUD tag and last known-good Pages deployment in the campaign handover record.
- If everyone is locked out, use the break-glass Cloudflare owner account to edit the Access policy in the dashboard. Do not delete the production database or expose a local admin token.
- If the public homepage accidentally asks visitors to sign in, remove the root or `/*` destination from the Access application, save, redeploy, and retest. A Pages rollback does not roll back Access policies or environment variables.
- If an allowed editor signs in but the studio shows `Authentication required`, confirm that the editor reached the same hostname/application whose AUD appears in `ACCESS_AUD`, then recheck `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, the Allow policy, and the fresh deployment.

## 9. Prepare the database

Choose **one** of the following paths. Do not run both.

### New D1 database

For the D1 database created in section 7, run:

```powershell
npm run db:remote
```

This executes `database/schema.sql` against the remote `sodangi-cms` database. It creates all current tables, default integration settings and starter content. The seed is idempotent: re-running it does not overwrite existing rows, but for a live site you should still use the existing-database path below.

Expected result: Wrangler reports successful remote SQL execution. If it says it cannot find the database, run `npx wrangler whoami`, verify the account, then verify the database name.

### Existing live D1 database

Use this path if the previous site contains real content, administrators or subscribers.

1. Stop and make a backup before changing anything. In PowerShell:

   ```powershell
   New-Item -ItemType Directory -Force .\backups
   npx wrangler d1 export sodangi-cms --remote --output=./backups/sodangi-cms-YYYY-MM-DD.sql
   ```

   On macOS/Linux, create the folder with `mkdir -p backups`.

   The export can contain email addresses and other personal data. Store it securely and do not commit the `backups` folder to a public repository.

2. Apply the migrations in order:

   ```powershell
   npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261117_bilingual_content.sql
   npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261118_facebook_integration.sql
    npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261121_password_admin.sql
   ```

3. Do **not** delete the old database and do **not** import `database/schema.sql` as a replacement for it.
4. Only deploy the updated code after both migration commands report success.

The first migration adds Hausa editorial translations. The second creates Facebook integration settings and changes only two unchanged starter-card image paths to smaller campaign images. The third adds the password-mode session and login-throttle tables; it is safe to apply even when you continue to use Access. All three are written to be safe to re-run.

## 10. Deploy the website

### Recommended first deployment: Wrangler CLI

1. Re-run the safety check:

   ```powershell
   npm run check
   ```

2. Build and deploy. If you kept the project name `sodangi-2027`, run:

   ```powershell
   npm run deploy
   ```

   If you chose another Pages project name, run:

   ```powershell
   npm run build
   npx wrangler pages deploy dist --project-name YOUR-PAGES-PROJECT-NAME
   ```

3. Wait for Wrangler to print the deployment URL. Open it in a browser.
4. Visit `/api/site`. You should see JSON describing the public website data.
5. In a private browser window, test `/admin` using the matching sign-in test in section 8.3A (password mode) or step 8.9 (Access) before sharing the site URL with editors.

The `functions/` directory contains the server-side Pages Functions. Deploy from the project root; do not use a basic drag-and-drop static upload, because it may omit the application API.

### Optional: GitHub-connected automatic deployments

Set this up only after the first CLI deployment succeeds.

1. Create a private GitHub repository and push this project. Do not include `.dev.vars`, `.env`, build output, backups or secrets.
2. In Cloudflare Pages, create or connect a Git-integrated project using that repository.
3. Set build command to `npm run build`, output directory to `dist`, production branch to `main`, and root directory to the project root.
4. Re-create the same bindings, variables, secrets and selected admin sign-in settings in the Pages project configuration.
5. Push a small documentation-only change and confirm that Cloudflare creates a preview deployment before relying on it for production.

The included GitHub workflow runs `npm run check` on pull requests and `main` pushes. It validates code; it does **not** deploy the site or manage Cloudflare secrets.

## 11. Use the content studio

### Step 11.1 — Sign in safely

Open `https://YOUR-SITE/admin` in a browser. If you chose Access, Cloudflare should sign in an allowed editor. If you chose password mode, enter the administrator password on the dedicated sign-in screen. In production, do not enter a local token anywhere; the local-token option is intentionally for localhost development only.

### Step 11.2 — Check the Overview first

The **Overview** page shows published stories, drafts, confirmed subscribers, R2 media readiness and recent editorial activity. If D1 is not connected or R2 is unexpectedly unavailable, fix that before asking editors to work.

### Step 11.3 — Update the website identity and information

1. Choose **Website settings**.
2. Select **English** or **Hausa**.
3. Select the area to edit, such as Brand, Home, About, Vision, DIGITs, Contact, Newsletter, Footer or Audio.
4. Update the logo, photos, biography, programme text, contact details and social URLs as appropriate.
5. Select **Save and publish**.
6. Open the public site in a new tab and check the change in both languages.

The editor lets you upload JPG, PNG, WebP and AVIF images smaller than 10 MB when R2 is configured. It accepts licensed MP3, M4A, OGG or WAV audio up to 20 MB. Upload only material the campaign owns or has permission to publish.

### Step 11.4 — Create and publish stories

1. Choose **News & stories**.
2. Select **Create publication**.
3. Choose **News / article**, **Social media post** or **Documented achievement**.
4. Start with status **Draft**. Add a source URL, image and only verified information.
5. For news and achievements, provide the reviewed Hausa title, summary and body before publishing. For imported social posts without an authorised Hausa translation, leave the post clearly untranslated rather than inventing copy.
6. Set status to **Published** only after an editor has checked the wording, claimed figures, image rights and source.

Published items appear on the public website. Drafts do not. Deleting an item is permanent from the CMS; keep source material and database backups.

### Step 11.5 — Review Operations

The **Operations** tab is a quick reminder about the selected sign-in protection, editorial review, launch testing and backups. It is not a substitute for the deployment and security steps in this guide.

## 12. Optional services

Start with a working, protected website. Add optional services one at a time and test each one before enabling it publicly.

### Newsletter with Brevo

1. Create a Brevo account and verify the sender email/domain you will use.
2. Create a dedicated confirmed-subscriber list and note its numeric list ID.
3. Set `BREVO_API_KEY`, `BREVO_LIST_ID`, `MAIL_FROM` and the final `SITE_ORIGIN` in Pages production settings. Keep the API key secret.
4. Create a fresh deployment.
5. Submit a test email using the public form, receive the confirmation email, click it, and confirm that the contact appears in the Brevo list.
6. Use Brevo's unsubscribe and compliance tools for mail campaigns. Obtain appropriate privacy/legal review before collecting real subscriber data.

If the settings are absent, the site deliberately reports that subscriptions are unavailable rather than pretending an email was saved.

### Facebook Page feed

This integration is optional. It imports up to the latest 25 eligible Page feed records on each run; it is not a complete social archive and it does not promise Reels or every Page content type. The app currently uses Meta Graph API v27, so review Meta's requirements and API-version notices periodically.

#### Before connecting

1. Confirm that the campaign owns or is authorised to manage the official Facebook Page.
2. Obtain a **Page access token** through a campaign-controlled Meta developer app. Do not use a personal token.
3. Confirm Meta's current permissions and any required app review. At the time of writing, managed-Page reads commonly require `pages_read_engagement` and `pages_read_user_content`; public Page access has different requirements. Meta can change these rules.
4. Ensure the Pages site is deployed, its `/admin` route is protected by the sign-in route selected in section 8, and the D1 database is prepared using section 9.

#### Configure the Pages application

1. Store the token only as the Pages secret:

   ```powershell
   npx wrangler pages secret put FB_PAGE_ACCESS_TOKEN --project-name sodangi-2027
   ```

2. Open **Admin → Integrations** after signing in through the route selected in section 8.
3. Enable the Facebook feed, enter the official numeric Page ID and `https://` Page URL, then choose a sync frequency.
4. Leave **Publish imported posts automatically** off for the first import.
5. Select **Save integration**, then **Sync now**.
6. Review every imported draft—especially factual claims, Hausa wording, media rights and links—before publishing selected items.

The Meta token is never stored in D1 and is never sent to the browser. The dashboard only tells you whether a token is configured.

#### Enable scheduled syncing

Manual sync works from Pages. To sync on a schedule, configure the separate Worker as well:

1. Open `workers/wrangler.toml` and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the **same** D1 ID used by the Pages project.
2. Store the same Meta token as a Worker secret. Wrangler prompts for it:

   ```powershell
   npx wrangler secret put FB_PAGE_ACCESS_TOKEN --config workers/wrangler.toml
   ```

3. Deploy the Worker:

   ```powershell
   npx wrangler deploy --config workers/wrangler.toml
   ```

4. Check the Worker logs and the studio integration status after the next expected run.

The Worker wakes every 15 minutes, then respects the longer cadence selected in the dashboard. Imported posts keep their external IDs and are not overwritten later, preserving editorial corrections. Automatic publishing affects new imports only; keep it off until there is a documented editorial policy.

To stop the integration, turn it off in **Admin → Integrations**. If a token could have been exposed, revoke/rotate it at Meta and replace both the Pages and Worker secrets.

### Instagram and TikTok

The studio can curate approved Instagram, TikTok and Facebook links manually as social items. Automated retrieval is not enabled for Instagram or TikTok because each provider requires its own approved API setup and permissions. Do not assume a public post is authorised for re-use just because it can be embedded.

## 13. Connect a custom domain

Do this after the Pages hostname works correctly.

1. In Cloudflare Pages, open your project and choose **Custom domains**.
2. Add the campaign-owned domain or subdomain and follow the DNS instructions shown by Cloudflare.
3. Wait until Cloudflare reports that HTTPS is active.
4. Change `SITE_ORIGIN` to the final canonical URL, for example `https://www.example.org`.
5. Create a fresh deployment.
6. If you use Cloudflare Access, add the custom hostname and `/admin`, `/admin/*`, `/api/admin/*` paths to the same Access application from step 8.6. Password mode uses the same site-origin cookie on the custom hostname, so test sign-in there after the domain becomes active.
7. Test both the custom hostname and the original `pages.dev` hostname. Redirect or protect every reachable hostname so one cannot bypass your intended policy.

Do not publish a domain that is still showing an old site, an invalid certificate or an unprotected admin route.

## 14. Test before launch

Complete this checklist with a named editor and a non-editor. Do not tick an item based only on an assumption.

### Platform and security

- [ ] `npm ci` and `npm run check` succeed on the computer used for deployment.
- [ ] The public URL loads over HTTPS and `/api/site` returns current JSON.
- [ ] `ENVIRONMENT=production` is set for production.
- [ ] A private/incognito browser without a valid sign-in cannot access editable CMS data.
- [ ] An Access editor, or the single password-mode owner, can sign in and save a harmless test field.
- [ ] `LOCAL_ADMIN_TOKEN` is absent from production settings.
- [ ] If password mode is used, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are Cloudflare secrets, not repository files, and sign-out returns to the password form.
- [ ] R2 upload is tested, or the studio clearly says media storage is not configured.
- [ ] No secret appears in the repository, `wrangler.toml`, screenshots, public issue tracker or frontend bundle.

### Content and experience

- [ ] Logo, biography, social links, email address and legal/contact content have been approved.
- [ ] Candidate-supplied claims remain clearly attributed until independently verified; see `CONTENT_VERIFICATION.md`.
- [ ] English and Hausa content has been checked by a qualified editor, including each published news/achievement item.
- [ ] Images have approval and alt text/meaningful surrounding copy where needed.
- [ ] The site has been checked at approximately 360 px, 390 px, 430 px, 768 px, 1024 px and desktop widths.
- [ ] Keyboard-only navigation, browser zoom, reduced motion and visible focus states work.
- [ ] Public media embeds work or display an honest click-through when the provider blocks embeds.

### Optional services

- [ ] Newsletter test delivery, confirmation and unsubscribe handling have been checked—or the form correctly reports unavailable.
- [ ] Facebook sync is disabled, or its token, Page ID, Page URL and first imports have been reviewed. Automatic publishing remains off until explicitly approved.
- [ ] Custom domain, HTTPS and `SITE_ORIGIN` agree on the same canonical hostname; Access paths are updated if Access is the selected route.

## 15. Operate, back up and recover

### Routine schedule

| When | Do this |
| --- | --- |
| Daily during an active campaign | Check new public content, broken links, incoming feedback and failed integration status. |
| Weekly | Review facts, Hausa translations, media rights, published/draft state and mobile performance. |
| Monthly | Export D1, review Cloudflare Access membership, check provider quotas and rotate credentials if policy requires it. |
| Before a major announcement | Test a Pages preview, have a second editor review content, and confirm rollback contacts. |

### Back up D1 safely

Use the export command from section 9 before any migration and at regular intervals:

```powershell
npx wrangler d1 export sodangi-cms --remote --output=./backups/sodangi-cms-YYYY-MM-DD.sql
```

Store exports encrypted or in access-controlled storage. They can contain subscriber data. Test restoration into a separate, non-production D1 database with a technical administrator; do not experiment with restores on the live database.

### Roll back a bad website release

1. In Cloudflare Pages, open the project's **Deployments** list.
2. Identify the last known-good production deployment.
3. Use Cloudflare's rollback/redeploy control for that version.
4. Test the public site and admin API after rollback.
5. If the problem is a database/content change, stop and restore only from a tested backup plan. A Pages rollback does not undo D1 changes.

If a secret was exposed, do not merely redeploy: revoke/rotate it with the provider, update Cloudflare Pages and Worker secrets where applicable, then investigate access logs.

## 16. Troubleshooting

| What you see | Likely cause | What to do |
| --- | --- | --- |
| `npm ci` or `npm run check` fails before a build | Wrong Node/npm version or interrupted dependency install | Run `node --version`; use Node 22–24 and npm 10+. Delete only the local `node_modules` folder if needed, then run `npm ci` again. Do not delete project source files. |
| `npm run cf:local` appears to do nothing | It is building first, or Wrangler is waiting for requests; it does not open a browser | Wait for Wrangler's **Ready** message, then manually open `http://localhost:8788`. If it stops with an error, run `npm run db:local` first and start it again. |
| The local Vite site shows preview data or no CMS edits | `npm run dev` only runs the frontend | Run `npm run db:local`, then `npm run cf:local`, and use the Wrangler URL. The scripts use `wrangler.local.toml`; do not run Pages development from `workers/`. |
| Local admin requests return 401 | Root `.dev.vars` is missing/malformed, a stale token was saved, or the browser is not using localhost | Put plain `ENVIRONMENT=development` and a new `LOCAL_ADMIN_TOKEN` in root `.dev.vars` (no trailing `\` and no escaped `http://`), restart `npm run cf:local`, then visit `http://localhost:8788/admin` and enter the matching token. |
| `/api/site` returns 503 locally | Pages Functions did not receive the local D1 binding, or the local database was not seeded | Stop the server, run `npm run db:local`, then use `npm run cf:local` exactly. Do not substitute a manual `wrangler pages dev dist` command. |
| `wrangler` says you are not authorised | Wrong Cloudflare login/account | Run `npx wrangler whoami`; then `npx wrangler logout` and `npx wrangler login` if necessary. |
| D1 command cannot find `sodangi-cms` | The database has another name or is in another account | Confirm the name in Cloudflare Dashboard/D1. Use that exact name in the command and configuration. |
| Public site works but admin says authentication is required | The selected sign-in route is incomplete or Pages variables are wrong | For Access, check the paths, named-user policy, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and `ENVIRONMENT=production`. For password mode, confirm the migration succeeded and `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and lower-case `ADMIN_AUTH_MODE=password` are stored as Pages secrets, then redeploy. Test in an incognito browser. |
| Upload fails | R2 is not created/bound, file is too large, or file type is unsupported | Confirm `MEDIA` is bound to the intended R2 bucket. Use JPG/PNG/WebP/AVIF images under 10 MB or licensed audio under 20 MB. |
| Newsletter says unavailable | One or more Brevo settings are missing | Verify `BREVO_API_KEY`, `BREVO_LIST_ID`, `MAIL_FROM`, sender verification and `SITE_ORIGIN`. Then deploy again and send a test. |
| Facebook panel says token not configured | The Pages secret is missing or was set for another project | Run the interactive Pages secret command again for the correct project, then refresh the protected admin page. |
| Facebook manual sync fails | Token expired, Page permissions are missing, Page ID is wrong, or Meta app review is incomplete | Check the Page token in Meta, current permissions, numeric Page ID and Worker/Pages logs. Do not paste the token into the dashboard. |
| Scheduled Facebook sync never runs | Worker not deployed, placeholder D1 ID remains, or Worker secret is missing | Check `workers/wrangler.toml`, deploy the Worker, set its separate secret, then inspect Worker logs. |
| Refreshing a public route gives a 404 | Deployment is missing the SPA fallback | Confirm `public/_redirects` was included in `dist` and redeploy from the project root. |
| A custom domain bypasses Access | Access only protects the Pages hostname or another alias remains public | Add every hostname and protected path to the Access application, then test each hostname in incognito mode. This row applies only when you selected Access. |

## Official references

- [Cloudflare Pages — deploy a React site](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Meta Page Feed reference](https://developers.facebook.com/docs/graph-api/reference/page/feed/)
- [Meta Page reference](https://developers.facebook.com/docs/graph-api/reference/page/)

Provider screens, permissions, limits and prices can change. At the point of deployment, check the relevant Cloudflare, Meta and Brevo dashboard instructions again. This guide gives the required project order and safety controls; it does not substitute for campaign approval, legal review, provider approval or independent verification of public claims.
