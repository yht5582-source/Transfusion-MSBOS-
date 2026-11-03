/* Deterministic education logic. No patient-specific validated prediction. */
const Coag=(()=>{
'use strict';
const exposure=['rbc','ffp','plt','cryst','colloid','loss','fibG'];
const labs={hb:['Hb','g/dL',0,30],platelet:['Platelet','×10⁹/L',0,2000],fibrinogen:['Fibrinogen','g/L',0,20],pt:['PT','s',1,300],ptNormal:['PT 參考值','s',1,100],inr:['INR','',.1,30],aptt:['aPTT','s',1,500],apttNormal:['aPTT 參考值','s',1,200],ca:['Ionized Ca','mmol/L',0,3],ph:['pH','',6.5,7.8],temp:['核心體溫','°C',25,43]};
const numeric=v=>v===null||v===undefined||String(v).trim()===''?null:(Number.isFinite(Number(v))?Number(v):null);
function validate(rows){let prev=null;for(const r of rows){if(!Number.isFinite(r.t)||r.t<0||r.t>10080)throw Error('時間須為 0–10080 分鐘');if(prev&&r.t<=prev.t)throw Error('時間須嚴格遞增；同次抽血請編輯原列');for(const k of exposure){if(!Number.isFinite(r[k])||r[k]<0)throw Error(k+' 累積量須為非負數');if(prev&&r[k]<prev[k])throw Error(k+' 累積量不得減少');}for(const [k,v]of Object.entries(labs))if(r[k]!=null&&(!Number.isFinite(r[k])||r[k]<v[2]||r[k]>v[3]))throw Error(v[0]+' 超出輸入範圍');prev=r;}return true;}
function latest(rows,k){for(let i=rows.length-1;i>=0;i--)if(rows[i][k]!=null)return{value:rows[i][k],t:rows[i].t,row:rows[i],index:i};return null;}
function assess(rows,c){validate(rows);const last=rows.at(-1);const now=last?.t??0;const L={};for(const k of Object.keys(labs))L[k]=latest(rows,k);const alerts=[];const add=(code,text,level='review')=>alerts.push({code,text,level});const bleeding=c.active||c.major||c.shock;
if(c.major||c.shock)add('mtp','重大出血／休克：立即由團隊評估啟動或持續 MTP/MHP、止血與灌流復甦；同步通知血庫、麻醉／急診及主治醫師，不等待檢驗或模擬。','urgent');
const fibCut=c.context==='nba'||c.context==='obstetric'?2:1.5;const pCut=c.context==='trauma'&&c.tbi?100:c.context==='obstetric'?75:50;
if(L.fibrinogen&&(c.context==='trauma'?L.fibrinogen.value<=fibCut:L.fibrinogen.value<fibCut))add('fib',`Fibrinogen ${L.fibrinogen.value} g/L：${c.context==='nba'?'低於重大出血警戒值 2.0':'達所選情境補充評估閾值 '+fibCut}；${bleeding?'評估冷沉澱或纖維蛋白原補充，依血庫規格與重測調整':'先核對病因與出血，不能僅憑此值自動輸血'}。`,bleeding?'urgent':'review');
if(L.platelet&&(c.context==='trauma'?L.platelet.value<=pCut:L.platelet.value<pCut))add('plt',`Platelet ${L.platelet.value} ×10⁹/L：${bleeding?'評估血小板補充':'核對出血／處置情境，非自動輸注'}；所選情境參考 ${pCut}，數量不代表功能。`,bleeding?'urgent':'review');
// PT/aPTT ratios only from paired reference in same blood draw.
const prolonged=rows.some(r=>r===L.pt?.row&&r.ptNormal!=null&&r.pt/r.ptNormal>1.5)||rows.some(r=>r===L.aptt?.row&&r.apttNormal!=null&&r.aptt/r.apttNormal>1.5)||L.inr?.value>1.5;
if(prolonged)add('factor',`PT/INR 或 aPTT 延長：${bleeding?'評估凝血因子缺乏與 FFP 目標導向補充':'核對病因與出血情境'}；肝病／抗凝血藥物不能以 INR 一律矯正。`,bleeding?'urgent':'review');
for(const [k,cut,msg]of [['ca',c.context==='trauma'?1.1:1,'游離鈣低：複測、評估 citrate 負荷及鈣補充；目標為正常範圍，不以警戒值當完整矯正目標'],['ph',7.2,'酸血症：評估灌流、休克與病因，不能只靠血品矯正'],['temp',35,'低體溫：積極保溫並使用適當血品加溫裝置']])if(L[k]&&L[k].value<cut)add(k,msg,bleeding?'urgent':'review');
const required=['platelet','fibrinogen','inr','aptt','ca','ph','temp'];const missing=required.filter(k=>!L[k]);if(missing.length)add('missing','資料不足／尚未測量：'+missing.map(k=>labs[k][0]).join('、')+'；不能當作正常。');
for(const k of required){const l=L[k];if(!l)continue;if(now-l.t>=c.stale)add('stale-'+k,`${labs[k][0]} 採樣距今 ${now-l.t} 分鐘：已達工具時效提醒，請核對是否重測。`);if(last.rbc-l.row.rbc>=4)add('rbc-'+k,`${labs[k][0]} 採樣後已輸 ${last.rbc-l.row.rbc} U RBC：考慮立即重測（NBA 每 4 U 再評估）。`,bleeding?'urgent':'review');}
for(const k of ['pt','aptt'])if(L[k]&&L[k].row[k+'Normal']==null)add('ref-'+k,labs[k][0]+' 缺同次參考值，無法計算倍數；不將秒數直接當比值。');
if(c.complex)add('complex','複雜病因：DIC、肝衰竭、抗凝血藥、ECMO/CPB、尿毒性血小板功能障礙等需病因評估及專科人工審核；停止數值情境外推。');
if(last?.vem?.trim())add('vem','已有 TEG/ROTEM 原值紀錄：依同儀器、同試劑及院內演算法由受訓人員判讀；不套跨平台閾值。');
if(bleeding&&alerts.some(x=>['fib','plt','factor','ca','ph','temp'].includes(x.code)))add('escalate','持續出血合併凝血／生理高風險訊號：立即由主治醫師及血庫人工審核，依臨床嚴重度評估啟動或升級 MTP，重複抽血及目標導向補充；不等待模擬。','urgent');
if(L.ca&&L.ca.value<.9)add('severe-ca','iCa <0.9 mmol/L：特別危急，應立即人工評估及處理，不論是否勾選持續出血。','urgent');
return{latest:L,alerts,urgent:alerts.some(x=>x.level==='urgent'),missing,summary:missing.length?'資料不足：仍須臨床與檢驗評估':'目前輸入未必反映全部止血能力；不能排除重大出血或功能性凝血障礙'};}
const blank=t=>({t,rbc:0,ffp:0,plt:0,cryst:0,colloid:0,loss:0,fibG:0});
function simulate(rows,c,plan,key,consume=20){
const no=reason=>({range:null,reason});if(!['platelet','fibrinogen'].includes(key))return no('此項僅實測，不作數值外推');validate(rows);if(c.complex)return no('複雜病因超出模型');if(!Number.isFinite(c.weight)||c.weight<40||c.weight>150)return no('模型限 40–150 kg 成人');if(!Number.isFinite(consume)||consume<0||consume>50)return no('消耗假設須為 0–50%/hr');
const anchor=latest(rows,key);if(!anchor)return no('缺少此項實測錨點');if(!Number.isFinite(plan.t)||plan.t<0||plan.t>60)return no('情境限未來 0–60 分鐘');for(const k of exposure)if(!Number.isFinite(plan[k])||plan[k]<0)return no('情境量需完整且非負');const now=rows.at(-1).t;if(now+plan.t-anchor.t>120)return no('距此項實測超過 120 分鐘，停止外推');
let prev=anchor.row;const intervals=[];for(const r of rows.slice(anchor.index+1)){const d={t:r.t-prev.t};for(const k of exposure)d[k]=r[k]-prev[k];intervals.push(d);prev=r;}intervals.push(plan);
// Stop on cumulative blood-volume replacement or implausible balance; no precision at extremes.
const sum=k=>intervals.reduce((s,d)=>s+d[k],0);const bvMin=c.weight*.06;if(sum('loss')/1000>=bvMin)return no('錨點後失血達估計血容量，停止簡化模型');
const values=[];for(const bvCoef of [.06,.08])for(const hct of [.35,.45])for(const retention of [.15,.4])for(const recovery of [.4,1])for(const cons of [0,consume/100]){
let v=anchor.value;const bv=c.weight*bvCoef,pv=bv*(1-hct);let balance=0;
for(const d of intervals){const input=d.rbc*.28+d.ffp/1000+d.plt*.25+d.cryst/1000*retention+d.colloid/1000;const loss=d.loss/1000;balance+=input-loss;if(Math.abs(balance)>.3*bv)return no('情境淨血管內容量偏差 >30% 血容量，停止外推；未納尿量與再分布');const dilution=Math.exp(-Math.min(loss,input)/bv)*bv/(bv+Math.max(0,input-loss));v*=dilution*Math.pow(1-cons,d.t/60);if(key==='platelet')v+=d.plt*(recovery===1?45:15)*70/c.weight;else v+=(d.ffp/1000*(recovery===1?3:1.5)+d.fibG)*recovery/pv;
}values.push(v);}
return{range:[Math.min(...values),Math.max(...values)],reason:'機制情境包絡；非信賴區間、非臨床預測，實際值可落在範圍外',anchor:anchor.t};}
function quality(cases,recipients,cross,used){for(const n of [cases,recipients,cross,used])if(!Number.isFinite(n)||n<0||!Number.isInteger(n))throw Error('請輸入非負整數');if(recipients>cases||used>cross||recipients>used||(recipients===0&&used>0))throw Error('受血人數／輸注單位／配血單位不一致（限同術式、期間及族群）');return{ct:used?cross/used:null,rate:cases?recipients/cases*100:null,index:cases?used/cases:null,util:cross?used/cross*100:null};}
return{numeric,validate,latest,assess,simulate,quality,exposure,labs,blank};})();
if(typeof module!=='undefined')module.exports=Coag;
