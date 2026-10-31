import test from "node:test";
import assert from "node:assert/strict";
import {estimate,SMALL_OFFICIAL} from "./shipping-compare.mjs";
test("mini 160円: only when item can fit dedicated envelope",()=>{
  const r=estimate({length:15,width:10,height:2,weight:0.3,padding:0,wall:0});
  assert.equal(r.bestPrice,160);
  assert.equal(r.recommendedResults[0].id,"mini");
  assert.equal(r.recommendedResults[0].requiredSupply.includes("専用封筒"),true);
});
test("mini unavailable for already packed dimensions",()=>{
  const r=estimate({length:15,width:10,height:2,weight:0.3,mode:"packed"});
  assert.equal(r.smallOptions.some(x=>x.id==="mini"),false);
});
test("nekoposu 210円 for 30x20x2cm 0.8kg",()=>{
  const r=estimate({length:30,width:20,height:2,weight:0.8,mode:"packed"});
  assert.equal(r.bestPrice,210);
  assert.deepEqual(r.smallOptions.map(x=>[x.id,x.price]),[["nekoposu",210],["packetpost",215],["packet",230]]);
});
test("packetpost 215円 when 1kg < weight <=2kg",()=>{
  const r=estimate({length:30,width:20,height:2,weight:1.5,mode:"packed"});
  assert.equal(r.smallOptions.some(x=>x.id==="packetpost"),true);
  assert.equal(r.smallOptions.some(x=>x.id==="nekoposu"),false);
  assert.equal(r.smallOptions.some(x=>x.id==="packet"),false);
});
test("if too thick, small shipment options do not appear",()=>{
  const r=estimate({length:30,width:20,height:4,weight:0.5,mode:"packed"});
  assert.deepEqual(r.smallOptions,[]);
});
test("oversized for mini, standard packet may still fit",()=>{
  const r=estimate({length:22,width:17,height:2,weight:0.5,mode:"item",padding:0,wall:0});
  assert.equal(r.smallOptions.some(x=>x.id==="mini"),false);
  assert.equal(r.smallOptions.some(x=>x.id==="packetpost"),true);
});
test("small packet size 14x9 and postbox constraints must be met",()=>{
  const tooSmall=estimate({length:10,width:8,height:1,weight:0.3,mode:"packed"});
  assert.equal(tooSmall.smallOptions.some(x=>x.id==="packetpost"),false);
  const tooLong=estimate({length:35,width:15,height:2,weight:0.3,mode:"packed"});
  assert.deepEqual(tooLong.smallOptions,[]);
});
test("unverified parcel material cost is not hidden in fee",()=>{
  const r=estimate({length:15,width:10,height:2,weight:0.2,padding:0,wall:0});
  assert.ok(r.recommendedResults[0].requiredSupply);
  assert.equal(r.recommendedResults[0].price,160);
  assert.ok(SMALL_OFFICIAL.mini.startsWith("https://help.jp.mercari.com/"));
});
