import type {Ctx} from '../../_shared';
import {json,fail,authorise,record,requireAdminCsrf,validExternalUrl} from '../../_shared';
const select=`SELECT c.*,t.title AS title_ha,t.excerpt AS excerpt_ha,t.body AS body_ha
FROM content c LEFT JOIN content_translations t ON c.id=t.content_id AND t.lang='ha'
ORDER BY c.updated_at DESC LIMIT 300`;
export const onRequestGet=async({request,env}:Ctx)=>{
 const admin=await authorise(request,env);if(!admin)return fail('Authentication required',401);
 try{const result=await env.DB.prepare(select).all();return json({entries:result.results||[]});}catch{return fail('Database needs migration: run database/migrations/20261117_bilingual_content.sql',503);}
};
export const onRequestPost=async({request,env}:Ctx)=>{
 const admin=await authorise(request,env);if(!admin)return fail('Authentication required',401);
 if(!requireAdminCsrf(request,admin))return fail('Invalid secure admin request.',403);
 const body:any=await request.json().catch(()=>null);
 if(!body||!['upsert','delete'].includes(body.action))return fail('Invalid content action');
 if(body.action==='delete'){
   if(typeof body.id!=='string'||!body.id)return fail('Missing ID');
   await env.DB.batch([
     env.DB.prepare('DELETE FROM content_translations WHERE content_id=?').bind(body.id),
     env.DB.prepare('DELETE FROM content WHERE id=?').bind(body.id)
   ]);
   await record(env,admin.email,'delete',body.id);return json({ok:true});
 }
 const e=body.entry;
 if(!e||!['news','social','achievement'].includes(e.kind)||typeof e.title!=='string'||!e.title.trim()||e.title.length>180)return fail('Content title or type invalid');
 for(const key of ['title','excerpt','body','image','url','platform','media_type','title_ha','excerpt_ha','body_ha']){
   if(key.endsWith('_ha')&&e[key]==null)e[key]='';
   if(typeof e[key]!=='string'||e[key].length>(key.includes('body')?20000:key.includes('title')?180:2000))return fail(`Invalid ${key}`);
 }
 if(e.url&&!validExternalUrl(e.url))return fail('External URL must use HTTPS');
 if(e.image&&!e.image.startsWith('/assets/')&&!e.image.startsWith('/api/media/')&&!validExternalUrl(e.image))return fail('Invalid image URL');
 if(!['draft','published'].includes(e.status))return fail('Status invalid');
 if(e.status==='published'&&e.kind!=='social'&&(!e.title_ha.trim()||!e.excerpt_ha.trim()||!e.body_ha.trim())){
   return fail('Published news and achievements must have a Hausa title, summary and body. Save as draft until translated.');
 }
 const id=(typeof e.id==='string'&&/^[a-zA-Z0-9\-_]{8,100}$/.test(e.id))?e.id:crypto.randomUUID();
 const date=typeof e.published_at==='string'&&!Number.isNaN(Date.parse(e.published_at))?e.published_at:new Date().toISOString();
 await env.DB.batch([
   env.DB.prepare(`INSERT INTO content(id,kind,title,excerpt,body,image,url,platform,media_type,status,published_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,
       image=excluded.image,url=excluded.url,platform=excluded.platform,media_type=excluded.media_type,
       status=excluded.status,published_at=excluded.published_at,updated_at=CURRENT_TIMESTAMP`)
     .bind(id,e.kind,e.title,e.excerpt,e.body,e.image,e.url,e.platform,e.media_type,e.status,date),
   env.DB.prepare(`INSERT INTO content_translations(content_id,lang,title,excerpt,body) VALUES(?,'ha',?,?,?)
     ON CONFLICT(content_id,lang) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body`)
     .bind(id,e.title_ha,e.excerpt_ha,e.body_ha)
 ]);
 await record(env,admin.email,'upsert',id);return json({ok:true,id});
};
