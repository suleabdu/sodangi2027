import type {Ctx} from '../_shared';
import {json,fail,getOrigin,hashToken} from '../_shared';
export const onRequestPost=async({request,env}:Ctx)=>{
 if(!env.BREVO_API_KEY||!env.MAIL_FROM||!env.BREVO_LIST_ID)return fail('Email subscriptions are being configured. Please try again later.',503);
 if(Number(request.headers.get('content-length')||0)>10000)return fail('Invalid submission',413);
 const b:any=await request.json().catch(()=>null);
 if(b?.website)return json({ok:true,message:'If this email can subscribe, a confirmation link will be sent.'});
 const email=String(b?.email||'').trim().toLowerCase();
 if(!b?.consent||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail('Enter a valid email and agree to receive updates.');
 const confirmToken=crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
 const unsubscribeToken=crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
 const confirmHash=await hashToken(confirmToken);const unsubscribeHash=await hashToken(unsubscribeToken);
 const origin=getOrigin(request,env);
 const link=`${origin}/api/confirm?token=${encodeURIComponent(confirmToken)}`;
 const name='SODANGI 2027 Information Platform';
 try {
  const result=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'content-type':'application/json'},body:JSON.stringify({sender:{email:env.MAIL_FROM,name},to:[{email}],subject:'Please confirm your subscription',htmlContent:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Confirm your subscription</h2><p>You requested updates from SODANGI 2027. Please confirm your email address before we send newsletters.</p><p><a href="${link}" style="background:#082152;color:white;padding:12px 18px;display:inline-block;text-decoration:none">Confirm subscription</a></p><p>If you did not request this, ignore this message.</p></div>`})});
  if(!result.ok)return fail('Subscription service is currently unavailable.',503);
  await env.DB.prepare(`INSERT INTO newsletter_subscribers(email,confirm_hash,unsubscribe_hash,confirmed_at,revoked_at,consent_at) VALUES(?,?,?,NULL,NULL,CURRENT_TIMESTAMP) ON CONFLICT(email) DO UPDATE SET confirm_hash=excluded.confirm_hash,unsubscribe_hash=excluded.unsubscribe_hash,confirmed_at=NULL,revoked_at=NULL,consent_at=CURRENT_TIMESTAMP`).bind(email,confirmHash,unsubscribeHash).run();
  return json({ok:true,message:'Check your inbox to confirm your email address.'});
 }catch{return fail('Subscription service is unavailable',503);}
};
