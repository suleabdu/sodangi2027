import type {Ctx} from '../_shared';
import {fail,hashToken} from '../_shared';
export const onRequestGet=async({request,env}:Ctx)=>{
 const token=new URL(request.url).searchParams.get('token')||'';
 if(!/^[a-z0-9-]{64,100}$/i.test(token))return fail('Invalid unsubscribe link.',400);
 const hash=await hashToken(token);
 const person=await env.DB.prepare('SELECT email FROM newsletter_subscribers WHERE unsubscribe_hash=?').bind(hash).first<{email:string}>();
 if(person){
  await env.DB.prepare('UPDATE newsletter_subscribers SET revoked_at=CURRENT_TIMESTAMP WHERE unsubscribe_hash=?').bind(hash).run();
  if(env.BREVO_API_KEY)await fetch('https://api.brevo.com/v3/contacts/'+encodeURIComponent(person.email),{method:'PUT',headers:{'api-key':env.BREVO_API_KEY,'content-type':'application/json'},body:JSON.stringify({emailBlacklisted:true})}).catch(()=>null);
 }
 return new Response('You have been unsubscribed from updates.',{headers:{'content-type':'text/plain; charset=utf-8'}});
};
