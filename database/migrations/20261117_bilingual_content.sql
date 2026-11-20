-- Apply once to an existing D1 database before deploying bilingual frontend.
CREATE TABLE IF NOT EXISTS content_translations (content_id TEXT NOT NULL, lang TEXT NOT NULL CHECK(lang IN ('ha')), title TEXT NOT NULL, excerpt TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(content_id,lang), FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE);
INSERT OR IGNORE INTO content_translations(content_id,lang,title,excerpt,body) VALUES ('intro-digits-2027','ha','SODANGI DIGITs: shirin horas da ƙwarewar dijital a mazabu','Shirin horas da matasa 120 da aka gabatar, tare da ba da gurabe goma ga kowace daga cikin mazabu 12.','SODANGI DIGITs shiri ne da aka gabatar domin horas da matasa a ƙwarewar zamani, ta hanyar zaɓar mutane goma daga kowace mazaba cikin mazabu 12 na yankin Bauchi. Jimillar mutanen da aka tsara ta kai 120.

Ƙwarewar da aka tsara ta haɗa da tallace-tallacen dijital, gyaran kayan fasaha, sarrafa bayanai, zane-zanen kwamfuta da kasuwanci ta intanet. An kuma gabatar da shirin kayan aiki da haɗin intanet ga waɗanda suka kammala bisa sharuɗɗa.

Wannan shawara ce, ba sanarwar buɗe rajista ba. Ba a tabbatar da kuɗaɗe, sharuɗɗan shiga ko ranakun ɗaukar masu shiga ba tukuna.');
INSERT OR IGNORE INTO content_translations(content_id,lang,title,excerpt,body) VALUES ('shares-framework-2027','ha','Fahimtar ginshikai shida na Tsarin SHARES','Tsaro, lafiya da ilimi, noma, wakilci, ƙarfafawa da makoma mai ɗorewa.','Bayanan da ɗan takara ya bayar sun bayyana ginshikai shida a ƙarƙashin SHARES: Tsaro da Aminci; Lafiya, Ilimi da Abinci Mai Gina Jiki; Sauye-sauye a Noma; Wakilci; Ƙarfafawa da Shigar Mata; da Makoma Mai Tabbaci.

Waɗannan manufofi ne da shawarwarin aiki. Aiwatar da su tana bukatar dokoki, haɗin gwiwar hukumomi, kuɗaɗe da gudanarwa mai ɗaukar nauyi.');
INSERT OR IGNORE INTO content_translations(content_id,lang,title,excerpt,body) VALUES ('biography-overview-2027','ha','Tarihin rayuwa da sana’ar Adam Chindo Sodangi','Taƙaitaccen bayanin tarihin da ɗan takarar ya bayar, wanda ya jero muhimman matsayai bakwai na shugabanci.','Bisa tarihin da aka bayar, Adam Chindo Sodangi masanin kimiyyar siyasa ne kuma mai fafutukar ƙungiyoyin farar hula da gogewar fiye da shekaru ashirin. Tarihin ya jero matsayai bakwai na shugabanci da wakilci tsakanin 2010 da 2026 a fannoni kamar lafiya, abinci mai gina jiki, shugabanci da ayyukan ƙungiyoyin farar hula.

An samo waɗannan bayanai ne daga takardun ɗan takarar. Ya kamata a tabbatar da su ta hanyar wasiƙun naɗi, bayanan ƙungiyoyi da wasu takardun hujja.');
