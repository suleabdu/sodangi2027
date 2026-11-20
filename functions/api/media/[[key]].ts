import type {Ctx} from '../../_shared';
import {fail} from '../../_shared';
export const onRequestGet=async({request,env,params}:Ctx)=>{
 if(!env.MEDIA)return fail('Media is not configured',503);
 const parts=params?.key;
 const key=Array.isArray(parts)?parts.join('/'):String(parts||'');
 if(!/^uploads\/[a-z0-9-]+\.(jpg|jpeg|png|webp|avif|mp3|m4a|ogg|wav)$/i.test(key))return fail('Invalid media key',400);
 const metadata=await env.MEDIA.head(key);
 if(!metadata)return fail('Media not found',404);
 const size=metadata.size;
 const headers=new Headers({
   'content-type':metadata.httpMetadata?.contentType||'application/octet-stream',
   'cache-control':'public, max-age=604800',
   'x-content-type-options':'nosniff',
   'accept-ranges':'bytes'
 });
 const requested=request.headers.get('range');
 if(requested){
   const match=/^bytes=(\d*)-(\d*)$/.exec(requested);
   if(!match)return new Response(null,{status:416,headers:{...Object.fromEntries(headers),'content-range':`bytes */${size}`}});
   const left=match[1],right=match[2];
   if(!left&&!right)return fail('Invalid range',416);
   let start=0,end=size-1;
   if(left){start=Number(left);end=right?Math.min(Number(right),size-1):size-1}
   else {const count=Number(right);start=Math.max(0,size-count)}
   if(start>=size||end<start||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return new Response(null,{status:416,headers:{'content-range':`bytes */${size}`}});
   const length=end-start+1;
   const file=await env.MEDIA.get(key,{range:{offset:start,length}});
   if(!file)return fail('Media not found',404);
   headers.set('content-range',`bytes ${start}-${end}/${size}`);
   headers.set('content-length',String(length));
   return new Response(file.body,{status:206,headers});
 }
 const file=await env.MEDIA.get(key);
 if(!file)return fail('Media not found',404);
 headers.set('content-length',String(size));
 return new Response(file.body,{headers});
};
