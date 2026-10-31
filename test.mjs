import test from 'node:test';
import assert from 'node:assert/strict';
import{classify}from'./calc.mjs';
test('60サイズ',()=>{const r=classify({length:10,width:10,height:10,pad:1,weight:1});assert.equal(r.sum,36);assert.equal(r.yamato,60);assert.equal(r.japanpost,60)});
test('宅急便の重量上限でクラスが上がる',()=>{const r=classify({length:30,width:20,height:10,pad:0,weight:8});assert.equal(r.yamato,100);assert.equal(r.japanpost,60)});
test('ゆうパックの25kg上限',()=>{assert.equal(classify({length:50,width:50,height:50,pad:0,weight:26}).japanpost,null)});
test('不正入力を拒否',()=>{assert.throws(()=>classify({length:0,width:2,height:3}));assert.throws(()=>classify({length:2,width:3,height:4,weight:0}))});
