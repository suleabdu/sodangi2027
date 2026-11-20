import { createRemoteJWKSet, jwtVerify } from 'jose';
export interface Env { DB: D1Database; MEDIA?: R2Bucket; ENVIRONMENT?:string; ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?:string; LOCAL_ADMIN_TOKEN?:string; BREVO_API_KEY?:string; BREVO_LIST_ID?:string; MAIL_FROM?:string; SITE_ORIGIN?:string; FB_PAGE_ACCESS_TOKEN?:string; }
export type Ctx = {request:Request; env:Env; params?:Record<string,string|string[]>};
export const json=(data:unknown, status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export const fail=(message:string,status=400)=>json({error:message},status);
export async function authorise(request:Request,env:Env){
  if(env.ENVIRONMENT==='development' && ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname) && env.LOCAL_ADMIN_TOKEN && request.headers.get('X-Local-Admin-Key')===env.LOCAL_ADMIN_TOKEN) return {email:'local-developer'};
  const domain=(env.ACCESS_TEAM_DOMAIN||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
  const aud=env.ACCESS_AUD; const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!domain||!aud||!token) return null;
  try { const jwks=createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`));
    const {payload}=await jwtVerify(token,jwks,{issuer:`https://${domain}`,audience:aud,algorithms:['RS256']});
    return {email:typeof payload.email==='string'?payload.email:'verified-admin'};
  } catch {return null;}
}
export async function record(env:Env,actor:string, action:string,target:string){await env.DB.prepare('INSERT INTO admin_audit(id,actor,action,target) VALUES(?,?,?,?)').bind(crypto.randomUUID(),actor,action,target).run();}
export function validExternalUrl(s:string){try {let u=new URL(s); return u.protocol==='https:' || (u.hostname==='localhost'&&u.protocol==='http:');}catch{return false;}}
export function getOrigin(req:Request,env:Env){ return (env.SITE_ORIGIN||new URL(req.url).origin).replace(/\/$/,'');}
export async function hashToken(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');}
