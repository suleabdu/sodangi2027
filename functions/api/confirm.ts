import type {Ctx} from '../_shared';
import {fail,hashToken} from '../_shared';
export const onRequestGet=async({request,env}:Ctx)=>{
 const token=new URL(request.url).searchParams.get('token')||'';
 if(!/^[a-z0-9-]{64,100}$/i.test(token))return fail('This confirmation link is invalid.',400);
 const hash=await hashToken(token);
 const person=await env.DB.prepare('SELECT email FROM newsletter_subscribers WHERE confirm_hash=? AND revoked_at IS NULL').bind(hash).first<{email:string}>();
 if(!person)return fail('This confirmation link has expired or already been used.',400);
 if(!env.BREVO_API_KEY||!env.BREVO_LIST_ID)return fail('Email service is not configured',503);
 const add=await fetch('https://api.brevo.com/v3/contacts',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'content-type':'application/json'},body:JSON.stringify({email:person.email,listIds:[Number(env.BREVO_LIST_ID)],updateEnabled:true})}).catch(()=>null);
 if(!add || !add.ok)return fail('We could not confirm your subscription. Please try the link again.',503);
 await env.DB.prepare('UPDATE newsletter_subscribers SET confirmed_at=CURRENT_TIMESTAMP,confirm_hash=NULL WHERE email=? AND confirm_hash=?').bind(person.email,hash).run();
 const loc=new URL('/',request.url);loc.searchParams.set('newsletter','confirmed');return Response.redirect(loc.toString(),302);
};
