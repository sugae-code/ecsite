import test from "node:test";
import assert from "node:assert/strict";
import {estimate, MERCARI_RAKURAKU, MERCARI_YUYU, materialsFor} from "./shipping-compare.mjs";
test("60cm 1kg: mercari 60 both 750",()=>{
 const r=estimate({length:20,width:20,height:10,padding:0,wall:0,weight:1});
 assert.equal(r.sum,50);assert.equal(r.results.length,2);
 assert.deepEqual(r.results.map(x=>x.price),[750,750]);assert.equal(r.bestPrice,750);
});
test("80cm / 4kg: rakuraku 850 and yuyu 870",()=>{
 const r=estimate({length:30,width:25,height:15,padding:0,wall:0,weight:4});
 assert.equal(r.sum,70);
 assert.equal(r.yamato,80);assert.equal(r.japanpost,80);
 assert.deepEqual(r.results.map(x=>x.price),[850,870]);
});
test("weight changes yamato class even when sum small",()=>{
 const r=estimate({length:20,width:20,height:10,padding:0,wall:0,weight:9});
 assert.equal(r.yamato,100);assert.equal(r.japanpost,60);
 assert.equal(r.results[0].size,100);assert.equal(r.results[0].price,1050);
});
test("packing allowance and wall are counted for item mode",()=>{
 const r=estimate({length:30,width:20,height:10,padding:1,wall:0.3,weight:1});
 assert.equal(Number(r.sum.toFixed(1)),67.8);
 assert.deepEqual(r.inner,[32,22,12]);
 assert.equal(r.results[0].size,80);
});
test("already packed box has no extra padding applied",()=>{
 const r=estimate({length:30,width:20,height:10,mode:"packed",padding:50,wall:50,weight:1});
 assert.equal(r.sum,60);assert.equal(r.uncertain,false);
});
test("25kg+ disables yuyu but not rakuraku up to 30kg",()=>{
 const r=estimate({length:30,width:20,height:10,mode:"packed",weight:26});
 assert.equal(r.japanpost,null);
 assert.equal(r.results.length,1);
 assert.equal(r.results[0].id,"rakuraku");
});
test("longest edge above 170cm is rejected by rakuraku",()=>{
 const r=estimate({length:171,width:5,height:5,mode:"packed",weight:1});
 assert.equal(r.yamato,null);
 assert.equal(r.results.length,1);
 assert.equal(r.results[0].id,"yuyu");
});
test("over 200cm or 30kg: no compatible mercari standard package",()=>{
 const r=estimate({length:150,width:100,height:20,mode:"packed",weight:31});
 assert.equal(r.results.length,0);assert.equal(r.bestPrice,null);
});
test("invalid inputs rejected without misleading prices",()=>{
 for(const input of [
 {length:0,width:10,height:10,weight:1},
 {length:1,width:10,height:10,weight:0},
 {length:1,width:10,height:10,weight:-1},
 {length:1,width:10,height:10,weight:1,padding:-1},
 {length:NaN,width:10,height:10,weight:1}
 ])assert.throws(()=>estimate(input));
});
test("official sizes and fees are explicitly enumerated",()=>{
 assert.equal(MERCARI_RAKURAKU[7][2],2500);
 assert.equal(MERCARI_YUYU[6][2],1900);
 assert.equal(materialsFor({inner:[30,20,10],outer:[31,21,11],sum:63}).suggested,80);
});
