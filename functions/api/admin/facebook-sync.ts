import type {Ctx} from '../../_shared';
import {authorise, fail, json, record} from '../../_shared';
import {syncFacebookFeed} from '../../_facebook';

export const onRequestPost = async ({request, env}: Ctx) => {
  const admin = await authorise(request, env);
  if (!admin) return fail('Authentication required', 401);
  try {
    const result = await syncFacebookFeed(env);
    await record(env, admin.email, 'facebook-sync', result.ok ? 'completed' : 'needs-attention');
    return result.ok ? json(result) : fail(result.message, result.skipped === 'not-configured' ? 409 : 502);
  } catch {
    return fail('Facebook sync needs the latest database migration.', 503);
  }
};
