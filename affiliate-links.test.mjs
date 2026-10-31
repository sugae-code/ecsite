import test from "node:test";
import assert from "node:assert/strict";
import {AFFILIATE,chooseAffiliateLink,allowedTrackingUrl} from "./affiliate-links.mjs";
test("unregistered account never generates tracked link",()=>{
  assert.equal(chooseAffiliateLink(AFFILIATE,"box",80),null);
  assert.equal(chooseAffiliateLink({confirmed:false,boxGeneral:"https://hb.afl.rakuten.co.jp/hgc/abc"},"box",80),null);
});
test("approved, official generated link is selectable by product and fallback",()=>{
  const cfg={confirmed:true,boxGeneral:"https://hb.afl.rakuten.co.jp/hgc/general",boxBySize:{"60":"https://hb.afl.rakuten.co.jp/hgc/60"},cushion:"https://a.r10.to/sample"};
  assert.equal(chooseAffiliateLink(cfg,"box",60),cfg.boxBySize["60"]);
  assert.equal(chooseAffiliateLink(cfg,"box",80),cfg.boxGeneral);
  assert.equal(chooseAffiliateLink(cfg,"cushion",80),cfg.cushion);
});
test("unapproved and malicious URL never eligible",()=>{
  for(const url of ["https://search.rakuten.co.jp/search/mall/box","javascript:alert(1)","http://hb.afl.rakuten.co.jp/hgc/test","https://hb.afl.rakuten.co.jp.evil.example/link","https://evil.example","",undefined]){
    assert.equal(allowedTrackingUrl(url),false);
    assert.equal(chooseAffiliateLink({confirmed:true,boxGeneral:url},"box",100),null);
  }
});
test("non-affiliate partner is never shown as a paid affiliate",()=>{
  assert.equal(chooseAffiliateLink({confirmed:true,provider:"rakuten",boxGeneral:"https://www.amazon.co.jp/s?k=box"},"box",60),null);
});
