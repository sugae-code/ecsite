import {ZONES,SIDE,COUNT_PER_ZONE,TOTAL,cellId,parseId,sceneFor,safeText,previewUrl,isActiveClaim} from './core.mjs';
const $=id=>document.getElementById(id);
let zone=0,selected=cellId(0,0),claims=new Map(),registryReady=false,previewing=false;
const params=new URL(location.href).searchParams;
const initialPlace=parseId(params.get('place'));
if(initialPlace){selected=initialPlace.id;zone=initialPlace.zone}
$('name').value=safeText(params.get('name')||'',24);
$('wish').value=safeText(params.get('wish')||'',68);
const regionsEnglish=['ASANAGI','HAKUMEI','MIZUKAGAMI','HANAKAGE','YUUNAGI','AMAOTO','GINSUNA','HOSHIKUZU','TSUKISHIRO','YOTO'];
for (let i=0;i<ZONES.length;i++) {
 const opt=document.createElement('option');opt.value=String(i);opt.textContent=String(i+1).padStart(2,'0')+' / '+ZONES[i];
 $('zone').appendChild(opt);
}
$('zone').value=String(zone);

function changeSelected(id) {
 const c=parseId(id);if(!c)return;
 selected=id;zone=c.zone;
 $('zone').value=String(zone);
 previewing=false;
 renderMap();
 renderDetail();
}
function renderMap(){
 const root=$('map');
 const nodes=document.createDocumentFragment();
 let occupied=0;
 for(let i=0;i<COUNT_PER_ZONE;i++){
  const id=cellId(zone,i),sc=sceneFor(id),claim=claims.get(id);
  const isClaimed=!!claim&&isActiveClaim(claim);
  if(isClaimed)occupied++;
  const el=document.createElement('button');
  el.type='button';el.className='tile'+(id===selected?' active':'')+(isClaimed?' claimed':'');
  el.setAttribute('aria-label',sc.region+' '+id+' '+(isClaimed?'登録済み':'座標'));
  el.setAttribute('aria-pressed',String(id===selected));
  el.style.setProperty('--h',String(sc.hue));
  el.title=id+' · '+sc.scene;
  el.addEventListener('click',()=>changeSelected(id));
  nodes.appendChild(el);
 }
 root.replaceChildren(nodes);
 $('map-label').textContent=ZONES[zone]+' / '+regionsEnglish[zone];
 $('count').textContent=registryReady?('登録 '+occupied+' / '+COUNT_PER_ZONE):'台帳を確認中';
}
function renderDetail(){
 const scene=sceneFor(selected);
 $('scene-region').textContent=scene.region;
 $('scene-name').textContent=scene.scene;
 $('scene-id').textContent=scene.id;
 $('scene-card').style.setProperty('--hue',String(scene.hue));
 const claimed=claims.get(selected);
 const active=registryReady && isActiveClaim(claimed);
 $('place-status').textContent=active?'掲載中':registryReady?'未登録':'台帳確認中';
 $('current-owner').hidden=!active;
 if(active){
   $('owner-name').textContent=claimed.display_name;
   $('owner-wish').textContent=claimed.wish||'';
   $('owner-term').textContent='掲載期限 '+new Date(claimed.expires_at).toLocaleDateString('ja-JP');
 }
 $('preview-box').hidden=!!active;
 if(!previewing && !active){
   $('scene-name').textContent=scene.scene;
   $('scene-region').textContent=scene.region;
 }
 $('feedback').textContent='';
}
function showPreview(){
 if($('preview-box').hidden)return;
 const scene=sceneFor(selected);
 const name=safeText($('name').value,24),wish=safeText($('wish').value,68);
 if(!name){$('feedback').textContent='先に、置きたい名前を入力してください。';$('name').focus();return}
 $('scene-name').textContent=name;
 $('scene-region').textContent=scene.region+' · '+scene.scene;
 previewing=true;
 $('feedback').textContent='見本を表示しました。これは登録済みの命名権ではありません。';
 return {name,wish};
}
$('preview').addEventListener('click',showPreview);
$('zone').addEventListener('change', e=>changeSelected(cellId(Number(e.target.value),0)));
$('share').addEventListener('click',async()=>{
 const preview=showPreview();if(!preview)return;
 const url=previewUrl(location.href,selected,preview.name,preview.wish);
 try {
   if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(url);$('feedback').textContent='見本URLをコピーしました。登録や購入はまだ行われていません。';return;
   }
 }catch(_){}
 // A user-selectable link is a safe fallback when clipboard access is denied.
 const link=document.createElement('a');link.href=url;link.textContent='見本を別画面で表示';
 link.rel='noopener';link.target='_blank';
 $('feedback').replaceChildren(document.createTextNode('コピーできないため、こちらを開いて共有してください： '),link);
});
renderMap();renderDetail();
if(initialPlace && $('name').value)showPreview();
(async()=>{
 try{
  const resp=await fetch('./registry.json',{cache:'no-store'});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  const data=await resp.json();
  if(data.schema!==1||!Array.isArray(data.claims)||data.claims.length>TOTAL)throw Error('Invalid registry');
  const next=new Map();
  for(const item of data.claims){
   if(!item||!parseId(item.id)||typeof item.display_name!=='string')throw Error('Invalid claim');
   if(next.has(item.id))throw Error('Duplicate claim');
   if(isActiveClaim(item))next.set(item.id,item);
  }
  claims=next;registryReady=true;
  $('ledger-status').textContent='公開台帳を確認しました · 登録 '+claims.size+' / '+TOTAL;
  renderMap();renderDetail();
  if(initialPlace && $('name').value) showPreview();
 }catch(e){
  $('ledger-status').textContent='公開台帳を確認できません';
  $('count').textContent='登録状況は不明です';
  $('place-status').textContent='台帳確認不可';
 }
})();
