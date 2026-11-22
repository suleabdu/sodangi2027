"""Offline release sanity checks, using only Python's standard library."""
from pathlib import Path
import json, re, sqlite3
P=Path(__file__).resolve().parents[1]
seed=json.loads((P/'src/seed.json').read_text(encoding='utf-8'))
ha=seed['translations']['ha']
assert len(seed['about']['roles'])==len(ha['about']['roles'])==7
assert len(seed['vision']['pillars'])==len(ha['vision']['pillars'])==6
assert len(seed['digits']['wards'])==12
for section in ['brand','home','about','vision','digits','contact','newsletter','footer','audio']:
    assert section in ha, f'Missing Hausa section {section}'
for a,b in zip(seed['about']['roles'],ha['about']['roles']):
    assert b['title'].strip() and b['detail'].strip() and a['year']==b['year']
for a,b in zip(seed['vision']['pillars'],ha['vision']['pillars']):
    assert all(b[k].strip() for k in ['title','summary','description']) and a['letter']==b['letter']
for k in ['title','intro','status','footerNote']:
    assert ha['digits'][k].strip()
for a,b in zip(seed['digits']['skills'],ha['digits']['skills']):assert a and b
for a,b in zip(seed['digits']['benefits'],ha['digits']['benefits']):assert a and b
assert seed['audio']=={'enabled':False,'title':'SODANGI 2027 — Background music','url':'','autoplay':True,'loop':True}
source=(P/'src/main.tsx').read_text(encoding='utf-8')
assert 'function Header({site,lang,setLang,path,go}:{site:SiteData;lang:Lang;' in source
assert 'function Home({site,entries,go,openSubscribe,lang}:{site:SiteData;' in source
assert "localizeSite(payload.site||seed,lang)" in source
assert "localizeEntries(payload.entries||[],lang)" in source
assert 'AudioPlayer config={site.audio} lang={lang}' in source
assert 'lang===\'ha\'?site.about.portrait' in source
assert 'English source flyer' not in source
for key in re.findall(r"tr\(lang,'([^']+)'\)",source):
    assert re.search(r'\b'+re.escape(key)+':', (P/'src/i18n.ts').read_text(encoding='utf-8')),key
con=sqlite3.connect(':memory:')
con.executescript((P/'database/schema.sql').read_text(encoding='utf-8'))
assert con.execute('SELECT COUNT(*) FROM content_translations').fetchone()[0]==3
assert con.execute('SELECT COUNT(*) FROM content WHERE status=\'published\'').fetchone()[0]==3
site=json.loads(con.execute('SELECT body FROM site_config WHERE id=\'main\'').fetchone()[0])
assert site['audio']['enabled'] is False
con.executescript((P/'database/migrations/20261117_bilingual_content.sql').read_text(encoding='utf-8'))
assert con.execute('SELECT COUNT(*) FROM content_translations').fetchone()[0]==3
con.executescript((P/'database/migrations/20261118_facebook_integration.sql').read_text(encoding='utf-8'))
assert con.execute("SELECT enabled,sync_interval_minutes FROM integration_settings WHERE provider='facebook'").fetchone()==(0,30)
con.executescript((P/'database/migrations/20261121_password_admin.sql').read_text(encoding='utf-8'))
assert con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_sessions'").fetchone()
assert con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_login_attempts'").fetchone()
assert 'audio/mpeg' in (P/'functions/api/admin/upload.ts').read_text(encoding='utf-8')
assert 'content-range' in (P/'functions/api/media/[[key]].ts').read_text(encoding='utf-8')
assert "fail('Hausa translations are required')" in (P/'functions/api/admin/site.ts').read_text(encoding='utf-8')
assert 'syncFacebookFeed' in (P/'functions/api/admin/facebook-sync.ts').read_text(encoding='utf-8')
password_auth=(P/'functions/_password_auth.ts').read_text(encoding='utf-8')
assert "PASSWORD_SESSION_COOKIE = '__Host-sodangi-admin'" in password_auth
assert 'HttpOnly' in password_auth and 'SameSite=Strict' in password_auth
assert 'MAX_LOGIN_ATTEMPTS = 5' in password_auth and 'passwordCsrfValid' in password_auth
assert 'ADMIN_AUTH_MODE' in (P/'functions/_shared.ts').read_text(encoding='utf-8')
for endpoint in ['content.ts','site.ts','integrations.ts','facebook-sync.ts','upload.ts']:
    assert 'requireAdminCsrf' in (P/'functions/api/admin'/endpoint).read_text(encoding='utf-8'), endpoint
env_example=(P/'.env.example').read_text(encoding='utf-8')
assert 'ADMIN_AUTH_MODE=' in env_example and 'ADMIN_PASSWORD=' in env_example and 'ADMIN_SESSION_SECRET=' in env_example
local_wrangler=(P/'wrangler.local.toml').read_text(encoding='utf-8')
assert 'binding = "DB"' in local_wrangler
assert 'database_id = "f90ecdfb-f670-4ba3-9a8e-1a57c5b4b9f8"' in local_wrangler
assert 'preview_database_id = "f90ecdfb-f670-4ba3-9a8e-1a57c5b4b9f8"' in local_wrangler
scripts=json.loads((P/'package.json').read_text(encoding='utf-8'))['scripts']
assert '--config wrangler.local.toml' in scripts['db:local']
assert '--d1 DB=f90ecdfb-f670-4ba3-9a8e-1a57c5b4b9f8' in scripts['cf:local']
print('PASS: TS7053 props, Hausa seed parity, CMS, password-admin safeguards, local Pages bindings, media player and idempotent SQLite migrations')
