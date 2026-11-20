import type {Ctx} from '../../_shared';
import {json,fail,authorise,record} from '../../_shared';
const ALLOWED: Record<string,{ext:string;size:number;kind:'image'|'audio'}> = {
  'image/jpeg':{ext:'jpg',size:10_000_000,kind:'image'},
  'image/png':{ext:'png',size:10_000_000,kind:'image'},
  'image/webp':{ext:'webp',size:10_000_000,kind:'image'},
  'image/avif':{ext:'avif',size:10_000_000,kind:'image'},
  'audio/mpeg':{ext:'mp3',size:20_000_000,kind:'audio'},
  'audio/mp3':{ext:'mp3',size:20_000_000,kind:'audio'},
  'audio/mp4':{ext:'m4a',size:20_000_000,kind:'audio'},
  'audio/x-m4a':{ext:'m4a',size:20_000_000,kind:'audio'},
  'audio/ogg':{ext:'ogg',size:20_000_000,kind:'audio'},
  'audio/wav':{ext:'wav',size:20_000_000,kind:'audio'},
  'audio/x-wav':{ext:'wav',size:20_000_000,kind:'audio'}
};
export const onRequestPost=async({request,env}:Ctx)=>{
 const admin=await authorise(request,env);if(!admin)return fail('Authentication required',401);
 if(!env.MEDIA)return fail('R2 MEDIA bucket is not configured',503);
 if(Number(request.headers.get('content-length')||0)>22_000_000)return fail('Upload maximum is 20 MB for audio',413);
 const form=await request.formData().catch(()=>null);const file=form?.get('file');
 if(!(file instanceof File))return fail('No media file supplied');
 const type=ALLOWED[file.type];
 if(!type||file.size===0||file.size>type.size)return fail('Images max 10 MB; MP3, M4A, OGG or WAV audio max 20 MB',413);
 const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());
 const text=new TextDecoder('ascii').decode(bytes);
 const plausible=type.kind==='audio'
   ? (type.ext==='mp3'?(text.startsWith('ID3')||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)):
      type.ext==='m4a'?text.slice(4,8)==='ftyp':type.ext==='ogg'?text.startsWith('OggS'):text.startsWith('RIFF')&&text.slice(8,12)==='WAVE')
   : (type.ext==='jpg'?bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff:
      type.ext==='png'?bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47:
      type.ext==='webp'?text.startsWith('RIFF')&&text.slice(8,12)==='WEBP':
      text.slice(4,8)==='ftyp'&&['avif','avis'].includes(text.slice(8,12)));
 if(!plausible)return fail(`${type.kind==='audio'?'Audio':'Image'} does not match the claimed file format`,415);
 const key=`uploads/${crypto.randomUUID()}.${type.ext}`;
 const mime=type.ext==='mp3'?'audio/mpeg':type.ext==='m4a'?'audio/mp4':type.ext==='wav'?'audio/wav':file.type;
 await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:mime,cacheControl:'public, max-age=604800'}});
 await record(env,admin.email,'upload',key);
 return json({ok:true,url:`/api/media/${key}`,kind:type.kind});
};
