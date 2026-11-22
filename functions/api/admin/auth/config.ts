import type { Ctx } from '../../../_shared';
import { json } from '../../../_shared';
import { passwordAuthConfig } from '../../../_password_auth';

/** Exposes only non-secret sign-in mode information for the admin screen. */
export const onRequestGet = async ({ env }: Ctx) => json(passwordAuthConfig(env));
