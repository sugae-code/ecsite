import test from "node:test";
import assert from "node:assert/strict";
import {visibleSponsors} from "./sponsors.mjs";
test("No unapproved sponsorship is ever displayed",()=>{
  assert.deepEqual(visibleSponsors([{label:"Sample",href:"https://example.org",approved:false,paymentVerified:true}]),[]);
  assert.deepEqual(visibleSponsors([{label:"Sample",href:"https://example.org",approved:true,paymentVerified:false}]),[]);
});
test("Only verified sponsor with safe HTTPS is displayed",()=>{
 const a={label:"Demo",href:"https://example.org/boxes",approved:true,paymentVerified:true};
 assert.deepEqual(visibleSponsors([a]),[a]);
 assert.deepEqual(visibleSponsors([{...a,href:"javascript:alert(1)"}]),[]);
});
