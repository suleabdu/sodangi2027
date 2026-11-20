# SODANGI 2027 — Changelog

## Version 1.1 — 17 November 2026

### Fixed
- TypeScript `TS7053` build errors from `words[lang]` with `lang` typed `any`; public Header and Home now use `Lang`.
- Most interface labels were hard-coded in English. All authored public pages use a shared English/Hausa UI dictionary.
- Seed text now has Hausa versions of biography, seven leadership roles, all six SHARES pillars, DIGITs programme information, policy notes and subscription/legal copy.
- The three initial newsroom entries have Hausa translations stored in a new `content_translations` D1 table.
- Existing database migrations can preserve English content. Admin `site_config` upgrades accept newly added translations and audio settings.

### Added
- Admin **English content / Hausa translations** section switcher.
- Dedicated Hausa title, summary and article body fields for publications. Published news/achievements require Hausa versions.
- Admin audio URL and MP3/M4A/OGG/WAV upload to protected Cloudflare R2 (max 20 MB); music enable/disable, autoplay request and loop settings.
- Persistent public music player with pause/play, volume, labelled status messages and pause-on-reel-open behaviour.
- HTTP range support on media downloads for audio seeking.
- Database upgrade migration, revised source generator and offline checks.

### Important limitations
- Browser policies prevent guaranteeing immediate unmuted audio playback on every first visit; visitors can always press Play.
- Real Facebook/Instagram/TikTok sync still requires approved accounts, permissions and configuration.
- Source translation is a working first draft and should be reviewed by a competent Hausa language editor.
- `npm run build` must be run on a computer with dependencies installed. The packaging environment cannot access the npm registry.
