// 余白の島 — finite fictional atlas. Every coordinate and scene is deterministic.
// A coordinate is not land, a security, a cryptocurrency, or a legal title to anything physical.
export const WORLD_NAME = '余白の島';
export const ZONES = ['朝凪','薄明','水鏡','花影','夕凪','雨音','銀砂','星屑','月白','夜灯'];
export const SIDE = 20;
export const COUNT_PER_ZONE = SIDE * SIDE;
export const TOTAL = ZONES.length * COUNT_PER_ZONE;
export const ANNUAL_PRICE_JPY = 4200;
export const TERM_DAYS = 365;
const PHENOMENA = ['星砂の海岸','月の浅瀬','硝子の草原','雲の回廊','光の入り江','静かな森林','霞の灯台','朝焼けの丘','青い砂丘','雨の花園','忘れられた港','風の湖'];
export const priceProjection = (active) => {
  if (!Number.isInteger(active) || active < 0 || active > TOTAL) throw new RangeError('Invalid subscriber count');
  return active * ANNUAL_PRICE_JPY;
};
export function cellId(zone, index) {
  if (!Number.isInteger(zone) || zone < 0 || zone >= ZONES.length ||
      !Number.isInteger(index) || index < 0 || index >= COUNT_PER_ZONE) throw new RangeError('Invalid coordinate');
  return 'YS-' + String(zone+1).padStart(2,'0') + '-' + String(index+1).padStart(4,'0');
}
export function parseId(value) {
  if (typeof value !== 'string' || !/^YS-\d{2}-\d{4}$/.test(value)) return null;
  const zone = Number(value.slice(3,5)) - 1;
  const index = Number(value.slice(6)) - 1;
  if (zone < 0 || zone >= ZONES.length || index < 0 || index >= COUNT_PER_ZONE) return null;
  if (cellId(zone,index) !== value) return null;
  return { id:value, zone, index, x:index%SIDE, y:Math.floor(index/SIDE) };
}
function hash(s) {
  let v = 2166136261;
  for(const char of s) { v ^= char.codePointAt(0); v=Math.imul(v,16777619); }
  return v>>>0;
}
export function sceneFor(id) {
  const coord=parseId(id);
  if (!coord) throw new RangeError('Unknown fictional coordinate');
  const seed=hash(id);
  return {
    ...coord, region:ZONES[coord.zone], scene:PHENOMENA[seed % PHENOMENA.length],
    hue: 170 + seed % 160,
    glow: 8 + (seed >>> 9) % 80,
    stars: 1 + (seed >>> 14) % 5,
    texture: (seed >>> 20) % 5,
  };
}
export function safeText(value, limit = 42) {
  if (typeof value!=='string') return '';
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[<>]/g,'').trim()).slice(0,limit).join('');
}
export function previewUrl(origin, id, name, message) {
  if (!parseId(id)) throw new RangeError('Unknown coordinate');
  const url=new URL(origin);
  url.search='';
  url.searchParams.set('place',id);
  if (safeText(name,24)) url.searchParams.set('name',safeText(name,24));
  if (safeText(message,68)) url.searchParams.set('wish',safeText(message,68));
  return url.toString();
}
export function isActiveClaim(claim, at=new Date()) {
  if (!claim || !parseId(claim.id)) return false;
  const start=Date.parse(claim.starts_at), end=Date.parse(claim.expires_at);
  return Number.isFinite(start) && Number.isFinite(end) && end>start &&
    start<=at.getTime() && end>at.getTime();
}
