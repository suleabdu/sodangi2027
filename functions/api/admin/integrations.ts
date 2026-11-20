import type {Ctx} from '../../_shared';
import {authorise, fail, json, record} from '../../_shared';
import {getFacebookSettings, isFacebookPageUrl} from '../../_facebook';

const intervals = new Set([15, 30, 60, 120, 360]);

function present(settings: Awaited<ReturnType<typeof getFacebookSettings>>, tokenConfigured: boolean) {
  return {
    enabled: settings.enabled,
    pageId: settings.pageId,
    pageUrl: settings.pageUrl,
    autoPublish: settings.autoPublish,
    syncIntervalMinutes: settings.syncIntervalMinutes,
    lastSyncedAt: settings.lastSyncedAt,
    lastStatus: settings.lastStatus,
    lastError: settings.lastError,
    tokenConfigured
  };
}

export const onRequestGet = async ({request, env}: Ctx) => {
  const admin = await authorise(request, env);
  if (!admin) return fail('Authentication required', 401);
  try {
    const facebook = await getFacebookSettings(env);
    return json({facebook: present(facebook, Boolean(env.FB_PAGE_ACCESS_TOKEN))});
  } catch {
    return fail('Integration settings need the latest database migration.', 503);
  }
};

export const onRequestPut = async ({request, env}: Ctx) => {
  const admin = await authorise(request, env);
  if (!admin) return fail('Authentication required', 401);
  if (Number(request.headers.get('content-length') || 0) > 10_000) return fail('Payload too large', 413);
  const body: unknown = await request.json().catch(() => null);
  const facebook = body && typeof body === 'object' ? (body as {facebook?: unknown}).facebook : null;
  if (!facebook || typeof facebook !== 'object' || Array.isArray(facebook)) return fail('Invalid Facebook integration settings');
  const value = facebook as Record<string, unknown>;
  const enabled = value.enabled;
  const autoPublish = value.autoPublish;
  const pageId = typeof value.pageId === 'string' ? value.pageId.trim() : '';
  const pageUrl = typeof value.pageUrl === 'string' ? value.pageUrl.trim() : '';
  const syncIntervalMinutes = Number(value.syncIntervalMinutes);
  if (typeof enabled !== 'boolean' || typeof autoPublish !== 'boolean' || !intervals.has(syncIntervalMinutes)) return fail('Invalid Facebook integration settings');
  if (pageId && !/^[a-zA-Z0-9._-]{3,100}$/.test(pageId)) return fail('Facebook Page ID is invalid');
  if (pageUrl && !isFacebookPageUrl(pageUrl)) return fail('Facebook Page URL must be an HTTPS Facebook Page URL');
  if (enabled && !pageId) return fail('A Facebook Page ID is required before enabling sync');
  try {
    await env.DB.prepare(`INSERT INTO integration_settings(provider,enabled,page_id,page_url,auto_publish,sync_interval_minutes,updated_at)
      VALUES('facebook',?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(provider) DO UPDATE SET enabled=excluded.enabled,page_id=excluded.page_id,page_url=excluded.page_url,
        auto_publish=excluded.auto_publish,sync_interval_minutes=excluded.sync_interval_minutes,updated_at=CURRENT_TIMESTAMP`)
      .bind(Number(enabled), pageId, pageUrl, Number(autoPublish), syncIntervalMinutes).run();
    await record(env, admin.email, 'integration-update', 'facebook');
    const settings = await getFacebookSettings(env);
    return json({facebook: present(settings, Boolean(env.FB_PAGE_ACCESS_TOKEN))});
  } catch {
    return fail('Integration settings need the latest database migration.', 503);
  }
};
