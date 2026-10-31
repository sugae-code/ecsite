export const YAMATO=[[60,2],[80,5],[100,10],[120,15],[140,20],[160,25],[180,30],[200,30]];
export const JAPAN_POST=[60,80,100,120,140,160,170];
export function classify({length,width,height,pad=1,weight=1}){
const xs=[length,width,height,pad,weight].map(Number);
if(xs.some(x=>!Number.isFinite(x)||x>10000)||xs.slice(0,3).some(x=>x<=0)||pad<0||weight<=0)throw Error('寸法・重量を正しく入力してください');
const dimensions=[Number(length)+Number(pad)*2,Number(width)+Number(pad)*2,Number(height)+Number(pad)*2];
const sum=dimensions.reduce((a,b)=>a+b,0);
const yamato=dimensions.some(x=>x>170)||weight>30?null:YAMATO.find(([size,maxkg])=>sum<=size&&weight<=maxkg)?.[0]??null;
const japanpost=sum<=170&&weight<=25?JAPAN_POST.find(x=>sum<=x)??null:null;
return{dimensions,sum,yamato,japanpost};
}
