// 検証日: 2026-10-31。必ず公式条件に照らして更新すること。
export const LAST_VERIFIED="2026-10-31";
export const MERCARI_RAKURAKU = [
  [60,2,750],[80,5,850],[100,10,1050],[120,15,1200],
  [140,20,1450],[160,25,1700],[180,30,2100],[200,30,2500]
];
export const MERCARI_YUYU = [
  [60,750],[80,870],[100,1070],[120,1200],[140,1450],
  [160,1700],[170,1900]
];
export const OFFICIAL = Object.freeze({
  rakuraku:"https://help.jp.mercari.com/guide/articles/136/",
  yuyu:"https://help.jp.mercari.com/guide/articles/177/",
  yamato:"https://www.kuronekoyamato.co.jp/ytc/customer/send/search/payment/size/",
  yamatoFare:"https://www.kuronekoyamato.co.jp/ytc/search/estimate/ichiran.html",
  yuPack:"https://www.post.japanpost.jp/service/send/domestic/delivery/yu-pack/",
  mercariStore:"https://help.jp.mercari.com/guide/categories/314/"
});
const JP = [60,80,100,120,140,160,170];
function fail(msg){ throw new RangeError(msg); }
export function estimate(input){
  const {length,width,height,weight,mode="item",padding=1,wall=0.3}=input;
  const required=[length,width,height,weight].map(Number);
  const p=Number(padding),w=Number(wall);
  if(required.some(n=>!Number.isFinite(n)||n<=0||n>10000) ||
     !Number.isFinite(p)||p<0||p>1000 || !Number.isFinite(w)||w<0||w>1000)
     fail("縦・横・高さ・重量は0より大きく、余裕と箱の厚みは0以上で入力してください。");
  if(!["item","packed"].includes(mode)) fail("入力方式が不明です。");
  const offset=mode==="packed"?0:2*(p+w);
  const outer=required.slice(0,3).map(n=>n+offset);
  const inner=required.slice(0,3).map(n=>n+(mode==="packed"?0:2*p));
  const sum=outer.reduce((a,b)=>a+b,0);
  const kg=required[3];
  const long=Math.max(...outer);
  const raku=MERCARI_RAKURAKU.find(([s,limit])=>s>=sum&&limit>=kg);
  const yuyu=kg<=25&&long<=170?MERCARI_YUYU.find(([s])=>s>=sum):null;
  const yamato=long<=170?MERCARI_RAKURAKU.find(([s,limit])=>s>=sum&&kg<=limit)?.[0]??null:null;
  const japanpost=kg<=25?JP.find(s=>s>=sum)??null:null;
  const results=[
    {id:"rakuraku",name:"らくらくメルカリ便 宅急便",size:long<=170?raku?.[0]??null:null,price:long<=170?raku?.[2]??null:null,href:OFFICIAL.rakuraku,notes:"メルカリでの取引専用。180サイズ以上は営業所または集荷のみ。"},
    {id:"yuyu",name:"ゆうゆうメルカリ便 ゆうパック",size:yuyu?.[0]??null,price:yuyu?.[1]??null,href:OFFICIAL.yuyu,notes:"メルカリでの取引専用。重量25kgまで。"},
  ].filter(r=>r.size!==null).sort((a,b)=>a.price-b.price || a.id.localeCompare(b.id));
  const bestPrice=results.length?results[0].price:null;
  return {outer,inner,sum,weight:kg,mode,uncertain:mode==="item",yamato,japanpost,results,bestPrice,oversize:!results.length,materials:materialsFor({inner,outer,sum})};
}
export function materialsFor({inner,outer,sum}){
  // 個別商品やSKUは断定しない。確定するのは「必要な箱の内寸」だけ。
  const sizes=[60,80,100,120,140,160,170,180,200];
  const suggested=sizes.find(s=>s>=sum)??null;
  let description="規格外の可能性。大型箱・配送条件を確認";
  if(suggested!==null){
    description=suggested<=100? "小〜中型の段ボール箱":suggested<=160?"大型段ボール箱":"特大段ボール箱";
  }
  const recommended=["必要内寸が"+inner.map(x=>x.toFixed(1)).join(" × ")+"cm以上の箱"];
  if(Math.max(...inner)<50)recommended.push("緩衝材（エアクッション・紙など）");
  else recommended.push("大型品向けの緩衝材");
  recommended.push("梱包用テープ");
  return {suggested,description,recommended};
}
