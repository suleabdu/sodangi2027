export interface FacebookSettings {
  enabled: boolean;
  pageId: string;
  pageUrl: string;
  autoPublish: boolean;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
}

export interface FacebookSyncEnv {
  DB: D1Database;
  FB_PAGE_ACCESS_TOKEN?: string;
}

type FacebookSettingsRow = {
  enabled: number;
  page_id: string;
  page_url: string;
  auto_publish: number;
  sync_interval_minutes: number;
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
};

type FacebookPost = {
  id?: unknown;
  message?: unknown;
  permalink_url?: unknown;
  created_time?: unknown;
  full_picture?: unknown;
  is_published?: unknown;
  attachments?: {data?: Array<{media_type?: unknown}>};
};

export type FacebookSyncResult = {
  ok: boolean;
  skipped?: 'disabled' | 'not-configured' | 'not-due';
  imported: number;
  existing: number;
  message: string;
};

const DEFAULT_SETTINGS: FacebookSettings = {
  enabled: false,
  pageId: '',
  pageUrl: '',
  autoPublish: false,
  syncIntervalMinutes: 30,
  lastSyncedAt: null,
  lastStatus: null,
  lastError: null
};

const shorten = (value: string, length: number) => value.length <= length ? value : `${value.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
const cleanText = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();
const validExternalUrl=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'||(url.hostname==='localhost'&&url.protocol==='http:');}catch{return false;}};

export function isFacebookPageUrl(value: string) {
  if (!validExternalUrl(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'facebook.com' || host === 'www.facebook.com' || host === 'm.facebook.com';
  } catch {
    return false;
  }
}

export async function getFacebookSettings(env: FacebookSyncEnv): Promise<FacebookSettings> {
  const row = await env.DB.prepare(`SELECT enabled,page_id,page_url,auto_publish,sync_interval_minutes,last_synced_at,last_status,last_error
    FROM integration_settings WHERE provider='facebook'`).first<FacebookSettingsRow>();
  if (!row) return {...DEFAULT_SETTINGS};
  return {
    enabled: Boolean(row.enabled),
    pageId: row.page_id || '',
    pageUrl: row.page_url || '',
    autoPublish: Boolean(row.auto_publish),
    syncIntervalMinutes: row.sync_interval_minutes || DEFAULT_SETTINGS.syncIntervalMinutes,
    lastSyncedAt: row.last_synced_at,
    lastStatus: row.last_status,
    lastError: row.last_error
  };
}

export function isFacebookSyncDue(settings: FacebookSettings, now = Date.now()) {
  if (!settings.enabled || !settings.lastSyncedAt) return settings.enabled;
  const parsed = Date.parse(settings.lastSyncedAt.replace(' ', 'T') + (settings.lastSyncedAt.includes('Z') ? '' : 'Z'));
  return Number.isNaN(parsed) || now - parsed >= settings.syncIntervalMinutes * 60_000;
}

async function setFacebookStatus(env: FacebookSyncEnv, status: string, error = '', markSynced = false) {
  const stamp = markSynced ? ',last_synced_at=CURRENT_TIMESTAMP' : '';
  await env.DB.prepare(`UPDATE integration_settings SET last_status=?,last_error=?,updated_at=CURRENT_TIMESTAMP${stamp} WHERE provider='facebook'`)
    .bind(status, error.slice(0, 500)).run();
}

function publicUrl(value: unknown) {
  const url = cleanText(value);
  return url && validExternalUrl(url) ? url : '';
}

function mediaType(post: FacebookPost, image: string) {
  const value = cleanText(post.attachments?.data?.[0]?.media_type).toLowerCase();
  if (value.includes('video')) return 'video';
  return image ? 'photo' : 'post';
}

/**
 * Imports Page-owned posts only. Existing imported posts are deliberately not
 * overwritten: an editor may have corrected, translated, or unpublished one.
 */
export async function syncFacebookFeed(env: FacebookSyncEnv): Promise<FacebookSyncResult> {
  const settings = await getFacebookSettings(env);
  if (!settings.enabled) return {ok: true, skipped: 'disabled', imported: 0, existing: 0, message: 'Facebook sync is disabled.'};
  if (!settings.pageId || !env.FB_PAGE_ACCESS_TOKEN) {
    await setFacebookStatus(env, 'needs-setup', 'Add a Page ID and configure the Meta access-token secret.');
    return {ok: false, skipped: 'not-configured', imported: 0, existing: 0, message: 'Facebook needs a Page ID and a server-side Meta access token.'};
  }

  try {
    const url = new URL(`https://graph.facebook.com/v27.0/${encodeURIComponent(settings.pageId)}/feed`);
    url.searchParams.set('fields', 'id,message,permalink_url,created_time,full_picture,is_published,attachments{media_type}');
    url.searchParams.set('limit', '25');
    url.searchParams.set('access_token', env.FB_PAGE_ACCESS_TOKEN);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Meta returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    const posts = (payload && typeof payload === 'object' && Array.isArray((payload as {data?: unknown}).data))
      ? (payload as {data: FacebookPost[]}).data : null;
    if (!posts) throw new Error('Meta returned an unexpected feed response');

    let imported = 0;
    let existing = 0;
    for (const post of posts) {
      if (post.is_published === false) continue;
      const externalId = cleanText(post.id);
      const permalink = publicUrl(post.permalink_url);
      if (!externalId || !permalink) continue;
      const id = `fb-${externalId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 90)}`;
      if (!id || id === 'fb-') continue;
      const text = shorten(cleanText(post.message) || 'Facebook update', 20_000);
      const image = publicUrl(post.full_picture);
      const result = await env.DB.prepare(`INSERT INTO content(id,kind,title,excerpt,body,image,url,platform,media_type,status,published_at,external_id)
        VALUES(?,'social',?,?,?,?,?,'facebook',?,?,?,?) ON CONFLICT(external_id) DO NOTHING`)
        .bind(id, shorten(text, 180), shorten(text, 320), text, image, permalink, mediaType(post, image), settings.autoPublish ? 'published' : 'draft', cleanText(post.created_time) || new Date().toISOString(), externalId)
        .run();
      if (result.meta.changes) imported += 1;
      else existing += 1;
    }
    await setFacebookStatus(env, 'connected', '', true);
    return {ok: true, imported, existing, message: `${imported} new Facebook ${imported === 1 ? 'post' : 'posts'} imported; ${existing} already present.`};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Facebook sync failed';
    await setFacebookStatus(env, 'error', message);
    return {ok: false, imported: 0, existing: 0, message: 'Facebook could not be synced. Check the Page permissions and token in Cloudflare.'};
  }
}
