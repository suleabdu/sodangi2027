import type {Ctx} from '../_shared';
import {fail} from '../_shared';

async function publicJson(request:Request,data:unknown){
  const body=JSON.stringify(data);
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
  const etag=`\"${[...new Uint8Array(bytes)].slice(0,12).map(v=>v.toString(16).padStart(2,'0')).join('')}\"`;
  const headers=new Headers({
    'content-type':'application/json; charset=utf-8',
    'cache-control':'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    'etag':etag,
    'x-content-type-options':'nosniff'
  });
  if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
  return new Response(body,{headers});
}

export const onRequestGet = async ({env,request}:Ctx)=>{
  if(!env.DB) return fail('Database is not configured. Follow the Cloudflare setup guide.',503);
  try{
    const item=await env.DB.prepare("SELECT body FROM site_config WHERE id='main'").first<{body:string}>();
    if(!item) return fail('Database not seeded; run database/schema.sql.',503);
    let entries:unknown[]=[];
    try {
      const results=await env.DB.prepare(`SELECT c.*,t.title AS title_ha,t.excerpt AS excerpt_ha,t.body AS body_ha
        FROM content c LEFT JOIN content_translations t ON c.id=t.content_id AND t.lang='ha'
        WHERE c.status='published' ORDER BY c.published_at DESC LIMIT 80`).all();
      entries=results.results||[];
    } catch {
      // Older deployment: serve existing public content while administrator applies migration.
      const basic=await env.DB.prepare("SELECT * FROM content WHERE status='published' ORDER BY published_at DESC LIMIT 80").all();
      entries=basic.results||[];
    }
    return publicJson(request,{site:JSON.parse(item.body),entries,source:'database'});
  }catch{return fail('Could not load the site data. Check bilingual database migration.',500);}
};
