import type {Ctx} from './_shared';
const xml=(value:string)=>value.replace(/[<>&'\"]/g,char=>({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[char]||char));
export const onRequestGet=async({request,env}:Ctx)=>{
 const origin=(env.SITE_ORIGIN||new URL(request.url).origin).replace(/\/$/,'');
 const paths=['/','/about','/vision','/digits','/impact','/news','/media','/contact','/privacy'];
 let articles:Array<{id:string;updated_at:string}>=[];
 try{
  const result=await env.DB.prepare("SELECT id,updated_at FROM content WHERE kind='news' AND status='published' ORDER BY published_at DESC LIMIT 500").all<{id:string;updated_at:string}>();
  articles=result.results||[];
 }catch{
  // A just-created or pre-migration deployment still receives the static sitemap.
 }
 const urls=[...paths.map(path=>({path,updated:''})),...articles.map(item=>({path:'/news/'+encodeURIComponent(item.id),updated:item.updated_at||''}))];
 const body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(item=>'<url><loc>'+xml(origin+item.path)+'</loc>'+(item.updated?'<lastmod>'+xml(new Date(item.updated).toISOString().slice(0,10))+'</lastmod>':'')+'</url>').join('')+'</urlset>';
 return new Response(body,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
};
