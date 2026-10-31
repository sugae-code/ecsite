// Pure issuer state machine. In production this must execute SERVER SIDE only,
// inside an atomic DB transaction AFTER Stripe webhook signature and payment verification.
// NEVER import this from an untrusted web form as proof of payment.
import { ANNUAL_PRICE_JPY, TERM_DAYS, parseId, safeText, isActiveClaim } from './core.mjs';
export function emptyLedger() { return { schema:1, claims:{}, receipts:{} }; }
export function registerVerifiedSale(state, payment, at = new Date()) {
  if (!(at instanceof Date) || !Number.isFinite(at.getTime())) throw new TypeError('Invalid time');
  if (!state || state.schema!==1 || !state.claims || !state.receipts) throw new TypeError('Invalid ledger');
  if (!payment || payment.serverVerified!==true) throw new Error('Server-verified payment required');
  if (!parseId(payment.placeId)) throw new RangeError('Invalid place');
  if (payment.currency!=='jpy' || payment.amount!==ANNUAL_PRICE_JPY) throw new Error('Incorrect price');
  if (typeof payment.receiptId!=='string' || !/^cs_live_[A-Za-z0-9]{8,200}$/.test(payment.receiptId)) throw new Error('Invalid live checkout reference');
  if (Object.prototype.hasOwnProperty.call(state.receipts,payment.receiptId)) {
    return { ledger:state, status:'duplicate', placeId:payment.placeId };
  }
  const existing = state.claims[payment.placeId];
  if (isActiveClaim(existing,at)) {
    // A refund / customer service queue is REQUIRED for conflicting paid transactions.
    return { ledger:state, status:'conflict_refund_required', placeId:payment.placeId };
  }
  const displayName=safeText(payment.displayName,24);
  const wish=safeText(payment.wish,68);
  if (!displayName) throw new Error('A display name is required');
  const start=new Date(at.getTime());
  const end=new Date(start.getTime()+TERM_DAYS*86400000);
  const claim={ id:payment.placeId, display_name:displayName, wish,
    starts_at:start.toISOString(), expires_at:end.toISOString() };
  return {status:'issued', placeId:payment.placeId, ledger:{
    schema:1,
    claims:{...state.claims,[payment.placeId]:claim},
    receipts:{...state.receipts,[payment.receiptId]:payment.placeId},
  }};
}
export function publicSnapshot(ledger, at=new Date()) {
  const claims=Object.values(ledger.claims).filter(c=>isActiveClaim(c,at));
  claims.sort((a,b)=>a.id.localeCompare(b.id));
  return {schema:1,updated_at:at.toISOString(),claims};
}
