import test from 'node:test';
import assert from 'node:assert/strict';
import {TIDE_LENGTH,tideNumber,secondsToNextTide,fishRadiusRange} from './tidebite-rules.mjs';
test('a tide lasts 75 seconds and rolls over without ending the game', () => {
  assert.equal(TIDE_LENGTH,75);
  assert.equal(tideNumber(0),1);
  assert.equal(tideNumber(74.999),1);
  assert.equal(tideNumber(75),2);
  assert.equal(tideNumber(225),4);
  assert.equal(secondsToNextTide(0),75);
  assert.equal(secondsToNextTide(74.9),1);
  assert.equal(secondsToNextTide(75),75);
});
test('nonfinite and negative times cannot break the HUD', () => {
  for(const t of [NaN,Infinity,-Infinity,-12]){
    assert.equal(tideNumber(t),1);
    assert.equal(secondsToNextTide(t),75);
  }
});
test('prey always edible, predators always dangerous at every size and tide', () => {
  for(const hero of [21,32,55,86]){
    for(const sec of [0,74,75,150,750,7500]){
      const prey=fishRadiusRange(hero,sec,.3);
      const predator=fishRadiusRange(hero,sec,.9);
      assert.ok(prey[0]>=8 && prey[0]<=prey[1]);
      assert.ok(prey[1]<=hero*.91,JSON.stringify({hero,sec,prey}));
      assert.ok(predator[0]>hero*1.17,JSON.stringify({hero,sec,predator}));
      assert.ok(predator[1]>=predator[0]);
    }
  }
});
