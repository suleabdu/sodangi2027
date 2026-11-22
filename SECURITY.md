# Security and data protection notes

## Access controls
The `/admin` frontend route is unlinked; this is not an access boundary. The default production route is Cloudflare Access for `/admin`, `/admin/*`, `/api/admin/*`. The API uses `jose` to validate the signed Access JWT from the `Cf-Access-Jwt-Assertion` header, with explicit expected issuer (`ACCESS_TEAM_DOMAIN`) and audience (`ACCESS_AUD`).

For a single trusted owner, an explicit `ADMIN_AUTH_MODE=password` alternative is available. It requires three server-only Pages secrets: `ADMIN_PASSWORD` (at least 16 characters), `ADMIN_SESSION_SECRET` (at least 32 characters), and the mode value. The browser receives only a short-lived 8-hour `__Host-` cookie (`Secure`, `HttpOnly`, `SameSite=Strict`); D1 stores only the session and CSRF hashes. State-changing password-mode requests require a same-origin CSRF token and failed logins are throttled after five attempts in 15 minutes. It must never be enabled until its database migration and both secret values are in place.

Password mode is a shared full-administrator identity (`password-admin`) and is not equivalent to named, MFA-protected Access accounts. Use Cloudflare Access for multiple editors or any higher-assurance deployment. No admin password or permanent token is built into public JavaScript. A local-only development override works solely on loopback hostname when `ENVIRONMENT=development` and a nonempty `LOCAL_ADMIN_TOKEN` matches.

## Storage
`site_config` contains public website text; `content` contains draft and published editorial items. `admin_audit` records editor and action. `newsletter_subscribers` stores email, consent and verification status; tokens are stored only as SHA-256 hashes. External email provider contact list also stores confirmed subscriber details. Configure restricted provider accounts and maintain a privacy impact review.

## Hardening before live launch
- For the recommended Access route, turn on MFA, use a small allowlist, restrict service accounts and retain activity logging.
- For password mode, use a unique password-manager-generated password, store it only as a Pages secret, test logout, and switch to Access before adding more than one trusted editor.
- Verify that an unauthorised browser cannot retrieve editable CMS data or make an editing API request.
- Protect API against abusive traffic with Cloudflare WAF, rate limiting and Turnstile as appropriate, especially newsletter endpoints.
- Avoid publicly displaying sensitive personal details of participants or applicants. Do not collect DIGITs applicant data until selection and privacy policies are approved.
- Configure CSP, security headers and a domain/cookie policy appropriate to production embedded media. External social embeds need their official host allowlists.
- Review URL validation and programmatic content type constraints whenever new fields or providers are added.
- Do not publish unreviewed file uploads; the upload endpoint checks common raster-image and audio signatures, but broader editor access should still add malware scanning/moderation.
- Run `npm audit --omit=dev` after `npm ci` and before publishing.
- Back up D1 regularly and rehearse export/restore.
- Set appropriate Access policies for **both production and preview URLs** when Access is selected. Password mode is restricted to the intended HTTPS site origin by its secure same-origin cookie.
- Set `ENVIRONMENT=production` and never configure LOCAL_ADMIN_TOKEN in the production environment.

## Current limitations
- No role-based distinction among Access-authorised administrators; all allowed accounts can edit. Password mode has one shared full-administrator actor. Add granular editor/reviewer roles if multiple untrusted editors are introduced.
- No automatic staged publishing or approval workflow; editors are responsible for verification before marking published.
- Subscriber data retention/deletion automation and granular per-provider suppression reconciliation require additional implementation and legal policy decisions.
- No dedicated CAPTCHA or application-level rate limiter is included. Configure Cloudflare edge protections before publicity drives traffic to forms.
- There is no external malware scanner. File-signature validation limits common spoofing but does not replace malware scanning/moderation for a larger editorial team.
- The initial privacy page is a draft and requires formal legal approval.
- This code has not been security-audited or live penetration-tested.

Do not describe an unpublished or untested release as "fully secure." The provided measures are a strong starting foundation, not a guarantee against compromise.


## Version 1.1 audio and translation safeguards

- The admin upload endpoint accepts specific image/audio formats in authenticated R2 storage and checks their headers before saving. Files are served from the site's own media route using `nosniff` and limited cache lifetime.
- Do not upload copyrighted songs without a valid licence. Track provenance and licensing separately from this code.
- Audible autoplay is not guaranteed and requires visitor-facing play/pause controls.
- New editorial news and achievement posts require English and Hausa body, title and summary to be published. Imported social posts without Hausa display an honest translation-pending message.
- Back up D1 before running `database/migrations/20261117_bilingual_content.sql` on an existing deployment.
- Facebook Page tokens are never stored in D1 or passed through the admin browser. Keep `FB_PAGE_ACCESS_TOKEN` only as a Cloudflare secret, restrict the Page and Meta app to approved administrators, and leave automatic publishing off until the editorial policy is approved.
