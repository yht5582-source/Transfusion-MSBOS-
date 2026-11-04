/* Guided product and pre-operative order suggestions. Reference doses for clinician review, never an order. */
const Guide=(()=>{
'use strict';
const C=typeof Coag!=='undefined'?Coag:require('./core.js');
const ok=v=>Number.isFinite(v);
// PT and aPTT arrive in seconds with the mean normal of the same report (MNPT, MNAPTT).
const ratio=(sec,mn)=>ok(sec)&&ok(mn)&&mn>0?sec/mn:null;
const item=(key,name,status,title,dose,why,src,cautions=[])=>({key,name,status,title,dose,why,src,cautions});
// VGHTPE 111-11-24: 1 U raises Hb about 0.5 g/dL in a 50-60 kg adult. Scaling by weight beyond that is a tool assumption.
const hbRisePerU=w=>.5*55/Math.max(ok(w)?w:55,55);
const need=(n,msg)=>item(n[0],n[1],'need','缺資料，無法判斷',null,msg,[]);
function rbc(p){const n=['rbc','紅血球'],src=['VGH','AABB'],bag='先輸 2 U（1 袋），輸後重測再決定下一步';
if(p.state==='major')return item(...n,'give','依大量輸血流程，不看單一 Hb','依本院 MTP 包組；RBC:FFP:PLT 至少 2:1:1','重大出血時 Hb 會延遲反映失血，不等檢驗。',['NBA']);
if(p.state==='bleeding'){if(p.hemo)return item(...n,'give','符合急性出血適應症',bag,'失血合併血壓或脈搏改變，或失血超過全身血量 15%。',['VGH']);if(!ok(p.hb))return need(n,'持續出血但沒有 Hb，也未勾血流動力變化。請抽血並重新評估。');if(p.hb<7)return item(...n,'give','低於出血時的目標範圍',bag,`Hb ${p.hb}，出血時目標約 7–9 g/dL。`,['AoA']);if(p.hb<=9)return item(...n,'consider','位於出血時的目標範圍','視出血速度與灌流決定，需要時先輸 2 U（1 袋）',`Hb ${p.hb}，目標約 7–9 g/dL。`,['AoA']);return item(...n,'no','目前不需','—',`Hb ${p.hb} 高於 9，持續監測；Hb 可能延遲反映失血。`,['AoA']);}
if(!ok(p.hb))return need(n,'穩定病人要有 Hb 才能判斷。');const cut=C.rbcCuts[p.rbcCase||'general'];
if(p.hb<cut){const est=Math.ceil((cut-p.hb)/hbRisePerU(p.weight)/2)*2;return item(...n,'give','低於此情境的輸血參考值',`${bag}；回到閾值估計約需 ${Math.max(est,2)} U`,`Hb ${p.hb} < ${cut} g/dL。1 U 在 50–60 kg 成人約升 0.5 g/dL；依體重估算為工具假設。`,src,p.taco?['有循環超載風險：放慢速率，每袋後評估。']:[]);}
if(p.symptoms)return item(...n,'consider','未達閾值但有症狀或缺血','個別評估，需要時先輸 2 U（1 袋）',`Hb ${p.hb}，閾值 ${cut}。決定也受症狀影響。`,src);
return item(...n,'no','目前不需','—',`Hb ${p.hb} 未低於 ${cut} g/dL。`,src);}
function platCut(p){if(p.state!=='stable')return p.neuro?100:p.context==='obstetric'?75:50;return{neuro:100,epidural:80,major:50,lp:40,line:20,marrow:20,none:10}[p.platProc||'none'];}
function plt(p){const n=['plt','血小板'],src=p.state==='stable'?['VGH','AoA']:p.neuro&&p.context==='trauma'?['EU','VGH']:['VGH','AoA'];
if(p.ttpHit&&p.state==='stable'&&(p.platProc||'none')==='none')return item(...n,'no','不宜預防性輸注','—','TTP 或 HIT 除非出血或即將手術，不宜輸血小板，可能增加動脈血栓風險。',['VGH']);
const cautions=[];if(p.ttpHit)cautions.push('TTP／HIT：輸注可能增加動脈血栓風險，請與血液科討論。');if(p.itp)cautions.push('ITP：輸注增加血小板的效果不大，除非有威脅生命的出血。');
if(!ok(p.plt)){if(p.state==='major')return item(...n,'give','依大量輸血流程','依本院 MTP 包組；不要等報告','檢驗未回前依包組給予。',['NBA'],cautions);return need(n,'沒有血小板數。');}
const cut=platCut(p);if(p.plt<cut||(p.context==='trauma'&&p.state!=='stable'&&p.plt<=cut)){const gap=cut-p.plt,lo=Math.max(1,Math.ceil(gap/40)),hi=Math.max(1,Math.ceil(gap/20));return item(...n,'give','低於此情境的參考值',`先輸 1 袋分離術血小板（約相當 12 U 濃厚液），輸後重測；要達 ${cut} 估計需 ${lo===hi?lo:lo+'–'+hi} 袋`,`血小板 ${p.plt}，參考值 ${cut} ×10⁹/L。1 袋通常約升 20–40 ×10⁹/L，敗血症、脾腫大等情況可能較少。`,src,cautions);}
if(p.pltFn&&p.state!=='stable')return item(...n,'consider','數量足夠但功能可能異常','個別評估，需要時 1 袋分離術血小板','血小板功能異常合併出血（藥物、ECMO 等），需看功能。',['VGH'],cautions);
if(p.state==='major')return item(...n,'consider','未達參考值，依流程與報告調整','依本院 MTP 包組',`血小板 ${p.plt}，參考值 ${cut} ×10⁹/L。`,['NBA','AoA'],cautions);
return item(...n,'no','目前不需','—',`血小板 ${p.plt} 未低於 ${cut} ×10⁹/L。數量不代表功能。`,src,cautions);}
function ffp(p){const n=['ffp','新鮮冷凍血漿'],w=p.weight,mlLo=ok(w)?10*w:null,mlHi=ok(w)?20*w:null,dose=ok(w)?`${mlLo}–${mlHi} mL（10–20 mL/kg），約 ${Math.ceil(mlLo/110)}–${Math.ceil(mlHi/110)} U；每 U 以 110 mL 估，依袋標核對`:'10–20 mL/kg（請填體重）',src=['VGH','AoA'];
const ptR=ratio(p.pt,p.mnpt),apttR=ratio(p.aptt,p.mnaptt),has=ok(p.inr)||ptR!==null||apttR!==null,high=(ok(p.inr)&&p.inr>1.5)||(ptR!==null&&ptR>1.5)||(apttR!==null&&apttR>1.5),noMn=[ok(p.pt)&&ptR===null?'MNPT':null,ok(p.aptt)&&apttR===null?'MNAPTT':null].filter(Boolean);
const cautions=[];if(noMn.length)cautions.push(`有秒數但缺 ${noMn.join('、')}，該項未計入判斷。`);if(p.liver)cautions.push('肝病：傳統凝血檢驗預測出血的能力有限，不要只為矯正數值而輸。');if(ok(p.inr)&&p.inr<=1.85)cautions.push('INR ≤1.85 時，FFP 不太可能明顯校正 INR。');if(p.taco)cautions.push('有循環超載風險：評估容量與速率。');
if(p.state==='major'&&!high)return item(...n,'give','依大量輸血流程','每 2 U RBC 至少配 1 U FFP；依本院 MTP','檢驗未回或未達閾值前依比例給予，再依結果調整。',['NBA'],cautions);
if(!has)return need(n,noMn.length?`有秒數但缺 ${noMn.join('、')}，無法計算倍數。`:'沒有 INR，也沒有 PT、aPTT 秒數。');
if(!high)return item(...n,'no','目前不需','—',`${ptR!==null?`PT ${ptR.toFixed(2)} 倍、`:''}${apttR!==null?`aPTT ${apttR.toFixed(2)} 倍、`:''}INR ${ok(p.inr)?p.inr:'未測'}，未超過 1.5；FFP 不用於補充白蛋白或容量。`,src,cautions);
if(p.state!=='stable')return item(...n,'give','出血合併凝血延長',dose,`${ptR!==null?`PT ${ptR.toFixed(2)} 倍、`:''}${apttR!==null?`aPTT ${apttR.toFixed(2)} 倍、`:''}INR ${ok(p.inr)?p.inr:'未測'}，合併出血。輸後重測再調整。`,['VGH','AoA','EU'],cautions);
if(p.invasive)return item(...n,'consider','將接受侵襲性處置',dose,'凝血因子缺乏且將接受侵襲性診療時可考慮。',['VGH'],cautions);
return item(...n,'no','沒有出血或處置，不預防性輸注','—','數值異常本身不是輸注理由。請先查病因。',src,cautions);}
function fib(p){const n=['fib','Fibrinogen 補充'],w=p.weight,uTw=ok(w)?2*Math.ceil(w/10):null,dose=(ok(w)?`冷凍沉澱品 ${uTw} U（每 10 kg 2 U）；每 U 含量 >75 mg，故至少約 ${(uTw*.075).toFixed(2)} g`:'冷凍沉澱品每 10 kg 2 U（請填體重）'),big=p.state==='stable'?'':'；出血指引的目標量為 3–4 g，需依血庫實際含量換算，濃縮製劑請確認院內供應';
if(!ok(p.fib)){if(p.state==='major')return item(...n,'consider','抽血評估，檢驗未回前依流程','依本院 MTP；目標量 3–4 g','大量輸血時須評估 fibrinogen，需要時補充。',['NBA']);return need(n,'沒有 fibrinogen。');}
const cut=p.state==='stable'?1:p.context==='obstetric'?2:1.5,low=p.context==='trauma'&&p.state!=='stable'?p.fib<=cut:p.fib<cut,cautions=['不要用 FFP 矯正低 fibrinogen。'];
if(low)return item(...n,p.state==='stable'?'consider':'give',p.state==='stable'?'低於 1.0，先確認病因':'出血合併低 fibrinogen',dose+big,`Fibrinogen ${p.fib} g/L，參考值 ${p.context==='trauma'&&p.state!=='stable'?'≤':'<'}${cut}。`,p.state==='stable'?['VGH','AoA']:['VGH','AoA','EU','NBA'],cautions);
const nbaNote=p.state!=='stable'&&p.fib<2?`Fibrinogen ${p.fib} 未達補充參考值，但 NBA 將 <2.0 視為嚴重生理紊亂，請持續監測。`:`Fibrinogen ${p.fib} g/L 未低於 ${cut}。`;
return item(...n,'no','目前不需','—',nbaNote,p.state==='stable'?['VGH']:['VGH','AoA','NBA']);}
function others(p){const out=[];if(p.warfarin&&p.state!=='stable'){const w=p.weight;out.push(item('pcc','Warfarin 反轉（PCC）','give','Warfarin 合併出血',ok(w)?`PCC 25–50 IU/kg，約 ${25*w}–${50*w} IU；沒有 PCC 時才用 FFP`:'PCC 25–50 IU/kg（請填體重）','PCC 通常 10–30 分鐘內反轉，給藥後 30 分鐘查 INR。',['NBA','AoA']));}
if(ok(p.ica)&&p.ica<(p.context==='trauma'?1.1:1))out.push(item('ca','鈣','give','游離鈣偏低','依院內流程補鈣並重測',`iCa ${p.ica} mmol/L；<0.9 特別危急。大量輸血的 citrate 會結合鈣。`,['EU','VGH']));
if(p.state!=='stable')out.push(item('txa','止血與抗纖溶','consider','同步評估','找出血源並止血；評估 tranexamic acid、回收式自體輸血（cell salvage）','預期失血 >500 mL 時建議。產後大出血為 1 g 靜脈給予，3 小時內開始。',['NBA','AoA']));
return out;}
function products(p){const list=[rbc(p),plt(p),ffp(p),fib(p),...others(p)];const banners=[];if(p.state==='major')banners.push('重大出血：立即啟動或持續大量輸血流程並找出血源止血，不要等本頁或檢驗結果。');if(p.complex)banners.push('複雜病因（DIC、ECMO、肝衰竭等）：下列參考值可能不適用，請專科評估。');if(!ok(p.weight))banners.push('請填體重，才能計算依體重給的劑量。');return{items:list,banners};}
const raw={h:'Hopkins 2025',u:'UPMC',t:'Toledo',n:'N Bristol',w:'Worcs',j:'HTAA',a:'ISBT 範例',b:'UKMMC'};
function prep(row,p={}){if(!row)return null;const rec=C.schedRec(row);let label=rec.kind==='cm'?`配血 ${rec.units} U（約 ${rec.units/2} 袋）`:rec.kind==='ts'?'血型與抗體篩檢（T&S）':'來源不足，不給建議值';const adjust=[];
if(p.antibody)adjust.push('不規則抗體：術前先與血庫聯絡並備妥相容血，不能只靠 T&S。');
if(p.remoteBank)adjust.push(rec.kind==='ts'?'血品無法快速取得：T&S 的前提不成立，建議至少配血 2 U（1 袋）。':'血品無法快速取得：預留運送時間。');
if(ok(p.hb)&&p.hb<10&&rec.kind==='ts')adjust.push(`術前 Hb ${p.hb} 偏低：考慮至少配血 2 U（1 袋）。北布里斯托對部分術式有類似加訂規則。`);
if(ok(p.plt)&&p.plt<80)adjust.push(`血小板 ${p.plt}：Worcestershire 視為風險因子，不要減少備血。`);
if((ok(p.inr)&&p.inr>1.5)||p.warfarin)adjust.push('凝血異常或使用 warfarin：術前先處理，並提高備血警覺。');
if(row.en==='Total knee replacement'||row.en==='Total hip replacement')adjust.push('台灣單一中心 2022 年初次全關節置換 232 人僅 4 人受血（C:T 58:1，預印本），CKD 4–5 期較常受血；可作院內檢討參考。');
if(p.redo)adjust.push('再次手術或預期沾黏：參考值可能偏低，由主刀與麻醉評估。');
if(rec.spread>=2)adjust.push('各來源差異大，須依院內資料裁定。');
const sources=C.schedSources.filter(k=>row[k]!==null).map(k=>({name:raw[k],value:row[k]}));return{kind:rec.kind,units:rec.units??null,label,n:rec.n,adjust,sources,zh:row.zh};}
return{products,prep,platCut,hbRisePerU,ratio};})();
if(typeof module!=='undefined')module.exports=Guide;
