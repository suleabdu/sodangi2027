import type {Ctx} from '../../_shared';
import {json,fail,authorise} from '../../_shared';
export const onRequestGet=async({request,env}:Ctx)=>{
 const a=await authorise(request,env); if(!a)return fail('Authentication required',401);
 const count=await env.DB.prepare("SELECT kind,status,COUNT(*) total FROM content GROUP BY kind,status").all();
 const subscribers=await env.DB.prepare("SELECT COUNT(*) total FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL AND revoked_at IS NULL").first<{total:number}>();
 const audit=await env.DB.prepare('SELECT actor,action,target,created_at FROM admin_audit ORDER BY created_at DESC LIMIT 15').all();
 let facebook:unknown={available:false};
 try{
  facebook=await env.DB.prepare("SELECT enabled,page_id,page_url,auto_publish,sync_interval_minutes,last_synced_at,last_status,last_error FROM integration_settings WHERE provider='facebook'").first()||{available:true};
 }catch{
  // Existing installations receive an actionable migration warning in the integrations panel.
 }
 return json({actor:a.email,counts:count.results||[],subscribers:subscribers?.total??0,audit:audit.results||[],mediaStorage:!!env.MEDIA,emailReady:!!(env.BREVO_API_KEY&&env.MAIL_FROM&&env.BREVO_LIST_ID),facebook,facebookTokenConfigured:!!env.FB_PAGE_ACCESS_TOKEN});
};
