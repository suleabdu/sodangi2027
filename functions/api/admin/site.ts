import type {Ctx} from '../../_shared';
import {json,fail,authorise,record,validExternalUrl} from '../../_shared';
export const onRequestGet=async({request,env}:Ctx)=>{
 const a=await authorise(request,env);if(!a)return fail('Administrator authentication required.',401);
 const r=await env.DB.prepare("SELECT body,updated_at FROM site_config WHERE id='main'").first();
 return json(r?{site:JSON.parse(String(r.body)),updated_at:r.updated_at}:{});
};
export const onRequestPut=async({request,env}:Ctx)=>{
 const a=await authorise(request,env);if(!a)return fail('Administrator authentication required.',401);
 if(Number(request.headers.get('content-length')||0)>150000)return fail('Payload too large',413);
 const data=await request.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))return fail('Invalid site settings');
 const existing=await env.DB.prepare("SELECT body FROM site_config WHERE id='main'").first<{body:string}>();
 if(!existing)return fail('Initial site configuration missing',503);
 const current=JSON.parse(existing.body);
 const allowed=[...new Set([...Object.keys(current),'translations','audio'])];
 if(Object.keys(data).some(k=>!allowed.includes(k)))return fail('Unexpected settings category');
 for(const key of allowed){if(!data[key]||typeof data[key]!=='object')return fail(`Missing category: ${key}`);}
 for(const field of ['facebook','instagram','tiktok']){ const v=data.contact?.[field];if(typeof v==='string'&&v&&!validExternalUrl(v))return fail(`Invalid ${field} URL`); }
 for(const field of ['logo','wideLogo']){let v=data.brand?.[field];if(typeof v!=='string'||!(v.startsWith('/assets/')||v.startsWith('/api/media/')||validExternalUrl(v)))return fail(`Invalid brand ${field}`);}
 const audio=data.audio;if(!audio||typeof audio!=='object'||typeof audio.enabled!=='boolean'||typeof audio.autoplay!=='boolean'||typeof audio.loop!=='boolean'||typeof audio.title!=='string'||audio.title.length>160||typeof audio.url!=='string')return fail('Invalid audio settings');
 if(audio.url&&!audio.url.startsWith('/assets/')&&!/^\/api\/media\/uploads\/[a-z0-9-]+\.(mp3|m4a|ogg|wav)$/i.test(audio.url)&&!validExternalUrl(audio.url))return fail('Invalid audio URL');
 if(!data.translations?.ha||typeof data.translations.ha!=='object')return fail('Hausa translations are required');
 if(data.vision?.pillars?.length!==data.translations.ha.vision?.pillars?.length||data.about?.roles?.length!==data.translations.ha.about?.roles?.length) return fail('Hausa pillar and leadership entries must match English item counts');
 const body=JSON.stringify(data); if(body.length>150000)return fail('Settings exceed size limit',413);
 await env.DB.prepare("UPDATE site_config SET body=?,updated_at=CURRENT_TIMESTAMP WHERE id='main'").bind(body).run();
 await record(env,a.email,'site-update','main');return json({ok:true});
};
