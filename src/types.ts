export type Entry = {
  id:string; kind:'news'|'social'|'achievement'; title:string; excerpt:string; body:string;
  title_ha?:string; excerpt_ha?:string; body_ha?:string;
  image:string; url:string; platform:string; media_type:string;
  status:'draft'|'published'; published_at:string; external_id?:string
};
export type SiteData = Record<string, any>;
export type SiteResponse={site:SiteData;entries:Entry[];source?:string;};
