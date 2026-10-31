// 広告掲載用。契約・入金確認済みのパートナーだけを編集者が明示追加する。
export const SPONSOR_SLOTS = [];
export function visibleSponsors(slots=SPONSOR_SLOTS){
 return slots.filter(s=>
   s && s.approved===true && s.paymentVerified===true &&
   typeof s.label==="string" && s.label.length>0 && s.label.length<90 &&
   typeof s.href==="string" && /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(s.href)
 );
}
