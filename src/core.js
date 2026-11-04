/* Deterministic education logic. No patient-specific validated prediction. */
const Coag=(()=>{
'use strict';
const exposure=['rbc','rbcMl','ffp','plt','pc','pltMl','cryoU','cryoMl','cryst','colloid','loss','fibG'];
const labs={hb:['Hb','g/dL',0,30],platelet:['Platelet','×10⁹/L',0,2000],fibrinogen:['Fibrinogen','g/L',0,20],pt:['PT','s',1,300],ptNormal:['MNPT','s',1,100],inr:['INR','',.1,30],aptt:['aPTT','s',1,500],apttNormal:['MNAPTT','s',1,200],ca:['Ionized Ca','mmol/L',0,3],ph:['pH','',6.5,7.8],be:['Base excess','mmol/L',-40,40],lactate:['Lactate','mmol/L',0,40],temp:['核心體溫','°C',25,43]};
const exposureNames={rbc:'RBC',rbcMl:'RBC 實際 mL',ffp:'FFP',plt:'分離術血小板',pc:'傳統血小板',pltMl:'血小板實際 mL',cryoU:'CRYO',cryoMl:'CRYO 實際 mL',cryst:'晶體液',colloid:'膠體液',loss:'失血',fibG:'補充 fibrinogen'};
// Context reference values; TBI / spontaneous ICH 100 is stated by both European trauma R30 and Anaesthetists 2025.
const cuts=c=>({fibrinogen:c.context==='nba'||c.context==='obstetric'?2:1.5,platelet:c.tbi?100:c.context==='obstetric'?75:50,inr:1.5,ca:c.context==='trauma'?1.1:1,ph:7.2,be:-6,lactate:4,temp:35});
const rbcCuts={general:7,cardiac:7.5,cvd:8,ami:10};
const numeric=v=>v===null||v===undefined||String(v).trim()===''?null:(Number.isFinite(Number(v))?Number(v):null);
function validate(rows){let prev=null;for(const r of rows){if(!Number.isFinite(r.t)||r.t<0||r.t>10080)throw Error('時間須為 0–10080 分鐘');if(prev&&r.t<=prev.t)throw Error('時間須嚴格遞增；同次抽血請編輯原列');for(const k of exposure){if(!Number.isFinite(r[k])||r[k]<0)throw Error(exposureNames[k]+' 累積量須為非負數');if(prev&&r[k]<prev[k])throw Error(`${exposureNames[k]} 累積量不得少於 ${prev.t} min 的 ${prev[k]}；請填累積量，不是本次增量`);}for(const [k,v]of Object.entries(labs))if(r[k]!=null&&(!Number.isFinite(r[k])||r[k]<v[2]||r[k]>v[3]))throw Error(v[0]+' 超出輸入範圍');prev=r;}return true;}
function latest(rows,k){for(let i=rows.length-1;i>=0;i--)if(rows[i][k]!=null)return{value:rows[i][k],t:rows[i].t,row:rows[i],index:i};return null;}
function assess(rows,c){validate(rows);const last=rows.at(-1);const now=last?.t??0;const L={};for(const k of Object.keys(labs))L[k]=latest(rows,k);const alerts=[];const add=(code,text,level='review')=>alerts.push({code,text,level});const bleeding=c.active||c.major||c.shock;
if(c.major||c.shock)add('mtp','重大出血／休克：立即由團隊評估啟動或持續 MTP/MHP、止血與灌流復甦；同步通知血庫、麻醉／急診及主治醫師，不等待檢驗或模擬。','urgent');
const cut=cuts(c),fibCut=cut.fibrinogen,pCut=cut.platelet;
if(L.fibrinogen&&(c.context==='trauma'?L.fibrinogen.value<=fibCut:L.fibrinogen.value<fibCut))add('fib',`Fibrinogen ${L.fibrinogen.value} g/L：${c.context==='nba'?'低於重大出血警戒值 2.0':'達所選情境補充評估閾值 '+fibCut}；${bleeding?'評估冷沉澱或纖維蛋白原補充，依血庫規格與重測調整':'先核對病因與出血，不能僅憑此值自動輸血'}。`,bleeding?'urgent':'review');
if(L.platelet&&(c.context==='trauma'||c.tbi?L.platelet.value<=pCut:L.platelet.value<pCut))add('plt',`Platelet ${L.platelet.value} ×10⁹/L：${bleeding?'評估血小板補充':'核對出血／處置情境，非自動輸注'}；${c.tbi?'TBI／自發性腦出血參考 100':c.context==='nba'?'NBA 未列血小板閾值，此處參考 Anaesthetists 2025 的 50':'所選情境參考 '+pCut}，數量不代表功能。`,bleeding?'urgent':'review');
// PT/aPTT ratios only from paired reference in same blood draw.
const prolonged=rows.some(r=>r===L.pt?.row&&r.ptNormal!=null&&r.pt/r.ptNormal>1.5)||rows.some(r=>r===L.aptt?.row&&r.apttNormal!=null&&r.aptt/r.apttNormal>1.5)||L.inr?.value>1.5;
if(prolonged)add('factor',`PT/INR 或 aPTT 延長：${bleeding?'評估凝血因子缺乏與 FFP 目標導向補充':'核對病因與出血情境'}；肝病／抗凝血藥物不能以 INR 一律矯正。`,bleeding?'urgent':'review');
for(const [k,limit,msg]of [['ca',cut.ca,'游離鈣低：複測、評估 citrate 負荷及鈣補充；目標為正常範圍，不以警戒值當完整矯正目標'],['ph',cut.ph,'酸血症：評估灌流、休克與病因，不能只靠血品矯正'],['temp',cut.temp,'低體溫：積極保溫並使用適當血品加溫裝置']])if(L[k]&&L[k].value<limit)add(k,`${labs[k][0]} ${L[k].value}${labs[k][1]?' '+labs[k][1]:''}（${L[k].t} min 採樣）：${msg}。`,bleeding?'urgent':'review');
for(const [k,bad,msg]of [['be',L.be&&L.be.value<cut.be,'代謝性酸中毒'],['lactate',L.lactate&&L.lactate.value>cut.lactate,'乳酸升高']])if(bad)add(k,`${labs[k][0]} ${L[k].value} mmol/L（${L[k].t} min 採樣）：${msg}，達 NBA 嚴重生理紊亂數值；評估灌流、休克與病因，不能只靠血品矯正。`,bleeding?'urgent':'review');
const required=['platelet','fibrinogen','inr','aptt','ca','ph','temp'];const missing=required.filter(k=>!L[k]);if(missing.length)add('missing','資料不足／尚未測量：'+missing.map(k=>labs[k][0]).join('、')+'；不能當作正常。');
for(const k of required){const l=L[k];if(!l)continue;if(Number.isFinite(c.stale)&&now-l.t>=c.stale)add('stale-'+k,`${labs[k][0]} 採樣距最新時間點（${now} min）${now-l.t} 分鐘：已達工具時效提醒，請核對是否重測。工具不讀取實際時鐘。`);if(last.rbc-l.row.rbc>=(c.repeatTwU??4))add('rbc-'+k,`${labs[k][0]} 採樣後已輸 ${last.rbc-l.row.rbc} 台灣 U RBC：考慮立即重測（工具提醒量；不是 NBA 海外 4 U 的換算）。`,bleeding?'urgent':'review');}
for(const k of ['pt','aptt'])if(L[k]&&L[k].row[k+'Normal']==null)add('ref-'+k,labs[k][0]+` 缺同次 ${k==='pt'?'MNPT':'MNAPTT'}，無法計算倍數；不將秒數直接當比值。`);
if(c.complex)add('complex','複雜病因：DIC、肝衰竭、抗凝血藥、ECMO/CPB、尿毒性血小板功能障礙等需病因評估及專科人工審核；停止數值情境外推。');
if(last&&((last.rbc>0&&last.rbcMl<=0)||((last.plt>0||last.pc>0)&&last.pltMl<=0)))add('volume','台灣血品已記錄單位／袋數，但缺實際輸注 mL；相關機制模型可能停止，請依血袋標示補齊。');
const vem=[...rows].reverse().find(r=>r.vem?.trim());if(vem)add('vem',`最近一筆 TEG/ROTEM 紀錄在 ${vem.t} min：`+'依同儀器、同試劑及院內演算法由受訓人員判讀；不套跨平台閾值。');
if(bleeding&&alerts.some(x=>['fib','plt','factor','ca','ph','be','lactate','temp'].includes(x.code)))add('escalate','持續出血合併凝血／生理高風險訊號：立即由主治醫師及血庫人工審核，依臨床嚴重度評估啟動或升級 MTP，重複抽血及目標導向補充；不等待模擬。','urgent');
if(L.ca&&L.ca.value<.9)add('severe-ca','iCa <0.9 mmol/L：特別危急，應立即人工評估及處理，不論是否勾選持續出血。','urgent');
alerts.sort((x,y)=>(y.level==='urgent')-(x.level==='urgent'));
return{latest:L,alerts,urgent:alerts.some(x=>x.level==='urgent'),missing,summary:missing.length?'資料不足：仍須臨床與檢驗評估':'目前輸入未必反映全部止血能力；不能排除重大出血或功能性凝血障礙'};}
const blank=t=>Object.fromEntries([['t',t],...exposure.map(k=>[k,0])]);
function simulate(rows,c,plan,key,consume=20){
const no=reason=>({range:null,reason});if(!['platelet','fibrinogen'].includes(key))return no('此項僅實測，不作數值外推');validate(rows);if(c.complex)return no('複雜病因超出模型');if(c.context==='obstetric')return no('妊娠血容量超出模型假設，產科情境不提供數值');if(!Number.isFinite(c.weight)||c.weight<40||c.weight>150)return no('模型限 40–150 kg 成人');if(!Number.isFinite(consume)||consume<0||consume>50)return no('消耗假設須為 0–50%/hr');
const anchor=latest(rows,key);if(!anchor)return no('缺少此項實測錨點');if(!Number.isFinite(plan.t)||plan.t<0||plan.t>60)return no('情境限未來 0–60 分鐘');for(const k of exposure)if(!Number.isFinite(plan[k])||plan[k]<0)return no('情境量需完整且非負');const now=rows.at(-1).t;if(now+plan.t-anchor.t>120)return no('距此項實測超過 120 分鐘，停止外推');
let prev=anchor.row;const intervals=[];for(const r of rows.slice(anchor.index+1)){const d={t:r.t-prev.t};for(const k of exposure)d[k]=r[k]-prev[k];intervals.push(d);prev=r;}intervals.push(plan);
for(const d of intervals){if(d.rbc>0&&d.rbcMl<=0)return no('RBC 缺實際輸注 mL，不以台灣 U 自動推定體積');if((d.plt>0||d.pc>0)&&d.pltMl<=0)return no('血小板缺實際輸注 mL');if(d.pc>0)return no('傳統 PC 含量未逐品核對，停止數值外推；不能將 PC 1 U 當 PH 1 袋');if(d.cryoU>0&&(d.cryoMl<=0||d.fibG<=0))return no('CRYO 缺實際體積或血庫核對 fibrinogen g，停止外推');}
// Stop on cumulative blood-volume replacement or implausible balance; no precision at extremes.
const sum=k=>intervals.reduce((s,d)=>s+d[k],0);const bvMin=c.weight*.06;if(sum('loss')/1000>=bvMin)return no('錨點後失血達估計血容量，停止簡化模型');
const values=[];for(const bvCoef of [.06,.08])for(const hct of [.35,.45])for(const retention of [.15,.4])for(const recovery of [.4,1])for(const cons of [0,consume/100]){
let v=anchor.value;const bv=c.weight*bvCoef,pv=bv*(1-hct);let balance=0;
for(const d of intervals){const input=d.rbcMl/1000+d.ffp/1000+d.pltMl/1000+d.cryoMl/1000+d.cryst/1000*retention+d.colloid/1000;const loss=d.loss/1000;balance+=input-loss;if(Math.abs(balance)>.3*bv)return no('情境淨血管內容量偏差 >30% 血容量，停止外推；未納尿量與再分布');const dilution=Math.exp(-Math.min(loss,input)/bv)*bv/(bv+Math.max(0,input-loss));v*=dilution*Math.pow(1-cons,d.t/60);if(key==='platelet')v+=d.plt*(recovery===1?45:15)*70/c.weight;else v+=(d.ffp/1000*(recovery===1?3:1.5)+d.fibG)*recovery/pv;
}values.push(v);}
return{range:[Math.min(...values),Math.max(...values)],reason:'機制情境包絡；非信賴區間、非臨床預測，實際值可落在範圍外',anchor:anchor.t};}
// C:T, TP and TI use crossmatched patients as denominator (Mead criteria); MSBOS trial value = 1.5 x TI.
function quality(cases,xm,recipients,cross,used){for(const n of [cases,xm,recipients,cross,used])if(!Number.isFinite(n)||n<0||!Number.isInteger(n))throw Error('請輸入非負整數');if(xm>cases||recipients>xm||used>cross||recipients>used||(recipients===0&&used>0)||xm>cross||(xm===0&&cross>0))throw Error('人次／單位不一致：須符合 受血≤配血人次≤手術人次、輸注 U≤配血 U、受血人次≤輸注 U、配血人次≤配血 U（限同術式、期間及族群）');const ti=xm?used/xm:null;return{ct:used?cross/used:null,tp:xm?recipients/xm*100:null,ti,util:cross?used/cross*100:null,rate:cases?recipients/cases*100:null,msbos:ti==null?null:1.5*ti};}
// Overseas schedules count units from a 450-500 mL donation, about one Taiwan 2 U bag (500 mL whole blood). Tool assumption, shown only in the comparison.
const toTaiwanU=overseas=>Number.isFinite(overseas)?overseas*2:null;
// Tool synthesis, not a guideline: median of listed sources (TS/none = 0, range = midpoint), at least 3 sources, rounded up to whole 2 U bags.
const schedSources=['h','u','t','n','w','j','a','b'];
const schedLevel=v=>Array.isArray(v)?(v[0]+v[1])/2:typeof v==='number'?v:v==='TS'||v==='-'?0:null;
function schedRec(row){const vals=schedSources.map(k=>schedLevel(row[k])).filter(v=>v!==null).sort((x,y)=>x-y),n=vals.length;if(n<3)return{kind:'few',n};const median=n%2?vals[(n-1)/2]:(vals[n/2-1]+vals[n/2])/2,spread=vals[n-1]-vals[0];return median===0?{kind:'ts',n,median,spread}:{kind:'cm',units:toTaiwanU(Math.ceil(median)),n,median,spread};}
return{numeric,validate,latest,assess,simulate,quality,cuts,rbcCuts,toTaiwanU,schedRec,schedSources,exposure,labs,blank};})();
if(typeof module!=='undefined')module.exports=Coag;
