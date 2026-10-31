import test from 'node:test';
import assert from 'node:assert/strict';
import { GENESIS, draftAllocation, giversRequiredForTarget } from './origin-right.mjs';

test('invented initial asset is not cash or claim against nonparticipants', () => {
  assert.equal(GENESIS.issuedUnits, 1);
  assert.equal(GENESIS.faceValueYen, 0);
  assert.equal(GENESIS.confirmedCashYen, 0);
  assert.equal(GENESIS.legalClaimAgainstNonparticipants, false);
});
test('no opt-in: no allocation', () => {
  assert.throws(() => draftAllocation({
    donorId: 'A', recipientId: 'B',
    monthlyGiftYen: 1000, originatorShareBps: 1000
  }), /Explicit opt-in/);
});
test('an opted-in gift splits exactly once; no added payment', () => {
  const x = draftAllocation({
    donorId: 'A', recipientId: 'B',
    monthlyGiftYen: 1000, originatorShareBps: 1000,
    explicitlyAcceptsOriginatorShare: true
  });
  assert.equal(x.recipientYen, 900);
  assert.equal(x.originatorYen, 100);
  assert.equal(x.recipientYen + x.originatorYen, 1000);
  assert.equal(x.status, 'UNSIGNED_UNPAID_DRAFT');
  assert.equal(x.donorCanStopFutureTransfers, true);
  assert.equal(x.referralRewards, false);
  assert.equal(x.digest.length, 64);
});
test('no self-allocation or invisible micro-share', () => {
  for (const [donorId, recipientId] of [
    ['A', 'A'], ['ORIGINATOR', 'B'], ['A', 'ORIGINATOR']
  ]) {
    assert.throws(() => draftAllocation({
      donorId, recipientId, monthlyGiftYen: 1000,
      originatorShareBps: 1000,
      explicitlyAcceptsOriginatorShare: true
    }), /Distinct parties/);
  }
  assert.throws(() => draftAllocation({
    donorId: 'A', recipientId: 'B', monthlyGiftYen: 10,
    originatorShareBps: 1, explicitlyAcceptsOriginatorShare: true
  }), /At least 1 yen/);
});
test('annual 10m threshold math never pretends to be income', () => {
  const s = giversRequiredForTarget({
    annualTargetYen: 10_000_000,
    monthlyGiftYen: 1000,
    originatorShareBps: 1000
  });
  assert.equal(s.requiredGivers, 8334);
  assert.equal(s.hypotheticalAnnualYen, 10_000_800);
  assert.equal(s.actualGivers, 0);
  assert.equal(s.verifiedRealCashYen, 0);
  assert.equal(s.status, 'HYPOTHETICAL_ONLY');
});
