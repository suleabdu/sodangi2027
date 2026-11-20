// Optional scheduled Worker. Deploy only after Meta app approval and after the
// Facebook integration migration has been applied to the shared D1 database.
import {getFacebookSettings,isFacebookSyncDue,syncFacebookFeed} from '../functions/_facebook';

interface Env {DB:D1Database; FB_PAGE_ACCESS_TOKEN?:string}
export default {
 async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext){
  ctx.waitUntil((async()=>{
   const settings=await getFacebookSettings(env);
   if(!isFacebookSyncDue(settings))return;
   const result=await syncFacebookFeed(env);
   if(!result.ok)throw new Error(result.message);
  })());
 }
};
