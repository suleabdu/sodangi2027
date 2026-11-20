# Version 1.1 — Replace the files in your local v1.0 folder

1. Back up your current project directory (including any locally modified source files).
2. Extract the **patch archive** into the directory **above** your `sodangi-2027` project folder so the included `sodangi-2027/src`, `functions`, `database`, etc. overwrite only the corresponding source files. Do not delete your custom `.dev.vars`, `wrangler.toml` or account secrets.
3. In PowerShell, from your project directory:

```powershell
npm ci
npm run check
```

4. For an **existing remote D1 database** (backup first):

```powershell
npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261117_bilingual_content.sql
npx wrangler d1 execute sodangi-cms --remote --file=./database/migrations/20261118_facebook_integration.sql
```

5. Deploy your updated Cloudflare Pages build using the procedure in `SETUP_GUIDE.md`.
6. Log in to `/admin`, open **Website settings** and save the configured audio/Hausa sections once. Edit Hausa and English separately. To enable music, choose **Audio**, upload a licensed file, and turn `enabled` on.
7. Recheck `/about`, `/vision`, `/digits`, `/impact`, `/news`, `/media`, `/contact` and `/privacy` in both languages.

**Notes:** An initial Hausa translation is provided and should be reviewed by a native editor. Browsers may block audible autoplay until a visitor taps Play. No song is supplied; upload only music you have permission to use.
