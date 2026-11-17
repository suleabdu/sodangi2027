# SODANGI 2027 — Vision for Bauchi

Public information website and editorial administration system for Adam Chindo Sodangi's candidacy for the Bauchi Federal Constituency seat in Nigeria's House of Representatives.

## Project status

**Initial project scaffold prepared; full source upload and deployment pending.** The complete starter package was generated in the associated ChatGPT conversation, along with a `SETUP_GUIDE.md`. Do not claim this GitHub repository currently contains the full source or a deployed site.

The prepared starter includes:
- Responsive public homepage and candidate biography using supplied campaign assets.
- Six SHARES Agenda policy sections, with candidate-supplied claims distinguished from verified achievements.
- SODANGI DIGITs programme page (proposed 120-person cohort across 12 wards).
- Newsroom, media hub and vertical viewer for supported embeds.
- Separate `/admin` content studio; production edit endpoints must be protected with Cloudflare Access and signed JWT verification.
- Cloudflare D1 database, optional R2 media uploads, double-opt-in newsletter foundation and optional authorised Facebook Page sync.
- Content verification, security and deployment documentation.

## Recommended stack

React + TypeScript + Vite; Cloudflare Pages Functions; Cloudflare D1; optional Cloudflare R2; Cloudflare Access; GitHub.

## Import the prepared starter

1. Download the **SODANGI_2027_Website_Production_Starter.zip** shared in the ChatGPT conversation.
2. Extract it, open a terminal in the extracted `sodangi-2027` directory and run:

```bash
npm install
npm run build
```

3. Review `SETUP_GUIDE.md` before any production deployment, especially Cloudflare Access protection of `/admin` and `/api/admin/*`.
4. After confirming the project builds, import the source files **without** node_modules, dist, .env secrets, .dev.vars or API tokens into this repository. For example, from the extracted project directory:

```bash
git init
git branch -M main
git remote add origin https://github.com/suleabdu/sodangi2027.git
git fetch origin
git checkout -b import-starter origin/main
git add .
git commit -m "Import SODANGI 2027 website starter"
git push -u origin import-starter
```

5. Open a pull request from `import-starter` to `main`, inspect the content and verify the build before merging.
6. In Cloudflare Pages connect the repository or deploy with Wrangler. Configure D1 bindings, separate production secrets and Access policies according to the setup guide.

## Source and factual review

Biographical roles are transcribed from campaign-supplied materials and should be corroborated before being published as independently verified. The SHARES and DIGITs programmes describe proposals rather than delivered results. The site should remain accessible and preserve the integrity of original campaign materials.

## Required configuration

Official social account URLs and approved integration credentials; authorised administrator accounts and Cloudflare Access application details; an approved privacy notice and contact channel; newsletter sender configuration; and approved manifesto/biography evidence. Never commit passwords, access tokens, subscriber data or private documents to a public repository.

---

**Repository initialized for the project. The live website has not yet been deployed or verified.**
