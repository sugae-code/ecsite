// ORIGIN-1: Voluntary creator share. Does not move money or create real debt.
import { createHash } from 'node:crypto';

export const GENESIS = Object.freeze({
  protocol: 'ORIGIN-1',
  assetId: 'ORIGIN-1/GENESIS/1',
  ownerId: 'ORIGINATOR',
  issuedUnits: 1,
  faceValueYen: 0,
  confirmedCashYen: 0,
  legalClaimAgainstNonparticipants: false
});

function integer(value, label, low, high) {
  if (!Number.isSafeInteger(value) || value < low || value > high) {
    throw new Error('Invalid ' + label);
  }
}
function person(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) {
    throw new Error('Invalid ' + label);
  }
}

// A person can allocate an already-intended gift to TWO recipients.
// The originator receives only the clearly disclosed and accepted share.
// This is an unsigned draft, NOT a bank instruction or actual contract.
export function draftAllocation({
  donorId, recipientId, monthlyGiftYen, originatorShareBps,
  explicitlyAcceptsOriginatorShare = false
}) {
  person(donorId, 'donorId');
  person(recipientId, 'recipientId');
  if ([recipientId, GENESIS.ownerId].includes(donorId)
      || recipientId === GENESIS.ownerId) throw new Error('Distinct parties required');
  integer(monthlyGiftYen, 'monthlyGiftYen', 1, 1000000000);
  integer(originatorShareBps, 'originatorShareBps', 1, 9999);
  if (explicitlyAcceptsOriginatorShare !== true) {
    throw new Error('Explicit opt-in consent required');
  }
  const originatorYen = Math.floor(monthlyGiftYen * originatorShareBps / 10000);
  const recipientYen = monthlyGiftYen - originatorYen;
  if (originatorYen === 0 || recipientYen === 0) {
    throw new Error('At least 1 yen must go to each recipient');
  }
  const allocation = {
    assetId: GENESIS.assetId,
    donorId, recipientId,
    grossMonthlyYen: monthlyGiftYen,
    originatorShareBps,
    originatorYen, recipientYen,
    donorCanStopFutureTransfers: true,
    originatorProvidesNoServiceOrProduct: true,
    referralRewards: false,
    noProtocolCustodyOfMoney: true,
    status: 'UNSIGNED_UNPAID_DRAFT'
  };
  return Object.freeze({
    ...allocation,
    digest: createHash('sha256').update(JSON.stringify(allocation)).digest('hex')
  });
}

// Hypothetical scale calculation, never actual income.
export function giversRequiredForTarget({
  annualTargetYen, monthlyGiftYen, originatorShareBps
}) {
  integer(annualTargetYen, 'annualTargetYen', 1, 100000000000);
  integer(monthlyGiftYen, 'monthlyGiftYen', 1, 1000000000);
  integer(originatorShareBps, 'originatorShareBps', 1, 9999);
  const perGiverMonthlyYen = Math.floor(monthlyGiftYen * originatorShareBps / 10000);
  if (perGiverMonthlyYen < 1) throw new Error('Share rounds down to zero');
  const requiredGivers = Math.ceil(annualTargetYen / (perGiverMonthlyYen * 12));
  return Object.freeze({
    annualTargetYen,
    perGiverMonthlyYen,
    requiredGivers,
    hypotheticalAnnualYen: requiredGivers * perGiverMonthlyYen * 12,
    actualGivers: 0,
    verifiedRealCashYen: 0,
    status: 'HYPOTHETICAL_ONLY'
  });
}
