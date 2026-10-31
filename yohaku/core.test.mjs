import test from 'node:test';
import assert from 'node:assert/strict';
import {ZONES,SIDE,TOTAL,ANNUAL_PRICE_JPY,cellId,parseId,sceneFor,previewUrl,safeText,priceProjection,isActiveClaim} from './core.mjs';
import {emptyLedger,registerVerifiedSale,publicSnapshot} from './ledger.mjs';
test('exactly 4,000 finite unique artificial coordinates',()=>{
 const ids=new Set();
 for(let z=0;z<ZONES.length;z++) for(let i=0;i<SIDE*SIDE;i++) {
  const id=cellId(z,i); assert.deepEqual(parseId(id),{id,zone:z,index:i,x:i%SIDE,y:Math.floor(i/SIDE)});
  ids.add(id);
 }
 assert.equal(ids.size,TOTAL);assert.equal(TOTAL,4000);
 assert.equal(parseId('YS-11-0001'),null);assert.equal(parseId('YS-01-0401'),null);
 assert.equal(parseId('YS-01-0000'),null);assert.equal(parseId('../secret'),null);
});
test('scenes are uniquely addressable and deterministic across refreshes',()=>{
 const id=cellId(3,42);
 assert.deepEqual(sceneFor(id),sceneFor(id));
 assert.notDeepEqual(sceneFor(id),sceneFor(cellId(3,43)));
});
test('public preview is never a registered ownership record',()=>{
 const url=previewUrl('https://example.com/yohaku/index.html?old=1','YS-01-0001','<明日>','大切なひと');
 const parsed=new URL(url);
 assert.equal(parsed.searchParams.get('name'),'明日');
 assert.equal(parsed.searchParams.get('wish'),'大切なひと');
 assert.equal(parsed.searchParams.has('old'),false);
 assert.equal(safeText(' \u0000<script> </script> ').includes('<'),false);
 assert.equal(safeText('x'.repeat(99),3),'xxx');
});
test('honest sales projection is arithmetic, never a revenue claim',()=>{
 assert.equal(priceProjection(0),0);
 assert.equal(priceProjection(2400),10080000);
 assert.equal(priceProjection(4000),TOTAL*ANNUAL_PRICE_JPY);
 assert.throws(()=>priceProjection(4001));
});
test('unverified, test, underpaid and fake payments cannot create claims',()=>{
 const at=new Date('2026-11-01T00:00:00Z');
 const p={serverVerified:true,placeId:'YS-01-0001',receiptId:'cs_live_abcdefgh12345678',currency:'jpy',amount:4200,displayName:'花',wish:'おめでとう'};
 const empty=emptyLedger();
 assert.throws(()=>registerVerifiedSale(empty,{...p,serverVerified:false},at));
 assert.throws(()=>registerVerifiedSale(empty,{...p,amount:420},at));
 assert.throws(()=>registerVerifiedSale(empty,{...p,receiptId:'cs_test_abcdefgh12345678'},at));
 assert.equal(Object.keys(empty.claims).length,0);
});
test('a verified paid receipt mints one 365-day public display license, idempotently',()=>{
 const at=new Date('2026-11-01T00:00:00Z');
 const p={serverVerified:true,placeId:'YS-01-0001',receiptId:'cs_live_abcdefgh12345678',currency:'jpy',amount:4200,displayName:'  花 ',wish:'また会えますように'};
 const result=registerVerifiedSale(emptyLedger(),p,at);
 assert.equal(result.status,'issued');
 assert.equal(result.ledger.claims[p.placeId].display_name,'花');
 assert.equal(registerVerifiedSale(result.ledger,p,at).status,'duplicate');
 assert.equal(Object.keys(result.ledger.receipts).length,1);
 assert.equal(publicSnapshot(result.ledger,at).claims.length,1);
 const later=new Date('2027-11-01T00:00:00Z');
 assert.equal(isActiveClaim(result.ledger.claims[p.placeId],later),false);
 assert.equal(publicSnapshot(result.ledger,later).claims.length,0);
});
test('a second paid sale cannot steal the same active coordinate',()=>{
 const at=new Date('2026-11-01T00:00:00Z');
 const base={serverVerified:true,placeId:'YS-01-0001',currency:'jpy',amount:4200,displayName:'先着',wish:'願い'};
 const first=registerVerifiedSale(emptyLedger(),{...base,receiptId:'cs_live_firstreceipt1234'},at);
 const second=registerVerifiedSale(first.ledger,{...base,receiptId:'cs_live_secondreceipt1234',displayName:'後から'},at);
 assert.equal(second.status,'conflict_refund_required');
 assert.deepEqual(second.ledger,first.ledger);
});
