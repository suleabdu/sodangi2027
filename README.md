# SODANGI 2027 — Public information platform

**Version 1.1** — React/TypeScript + Cloudflare Pages/Workers/D1/R2 starter.

This source package contains:

- Responsive pages for biography, SHARES Agenda, DIGITs, achievements, newsroom, media and contact.
- English/Hausa support across public copy and editorial data, with bilingual administration.
- A separate Cloudflare Access-protected `/admin` content studio.
- Optional admin-uploaded background music with visible play/pause and volume controls; browser autoplay restrictions apply.
- Protected image/audio uploads to R2, D1 seed and existing-database migration.
- A mobile-first protected content studio for branding, images, biography, bilingual content, stories, operations and Facebook Page sync settings.
- An optional Facebook Page connector that keeps Page credentials in Cloudflare secrets and imports posts as editorial drafts by default.

## Quick start

```bash
npm ci
npm run check
npm run dev
```

Open http://localhost:5173 for the static seed-data preview. For the full CMS, safe Cloudflare deployment, and existing-database upgrade path, follow the step-by-step [SETUP_GUIDE.md](SETUP_GUIDE.md), starting at **Choose the right path** and **Prepare the database**.

**Production is not deployed or fully browser-tested by this source package alone.** Apply the current D1 migrations, configure Cloudflare Access and secrets, and complete device QA before launch. Additional Meta approvals and API credentials are required for Facebook sync and newsletters.

## Source and factual review

Biographical roles are transcribed from campaign-supplied materials and should be corroborated before being presented as independently verified evidence. The SHARES and DIGITs programmes describe proposals rather than delivered results. The site should remain accessible and preserve the integrity of original campaign materials.

## Required configuration

Official social account URLs and approved integration credentials; authorised administrator accounts and Cloudflare Access application details; an approved privacy notice and contact channel; newsletter sender configuration; and approved manifesto/biography evidence. Never commit passwords, access tokens, subscriber data or private documents to a public repository.
