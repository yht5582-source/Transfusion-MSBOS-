const {test}=require('node:test'),a=require('node:assert/strict'),M=require('../src/msbos.js');
test('reference surgery table is populated',()=>{a.ok(M.rows.length>=60);a.equal(new Set(M.rows.map(r=>r.id)).size,M.rows.length)});
test('each row has traceable source, location and explicit local status',()=>{for(const r of M.rows){a.ok(r.name&&r.specialty&&r.location);a.ok(M.sources[r.source].url.startsWith('https://'));a.equal(r.localApproved,false);a.ok(['N','TS','TC'].includes(r.category));a.ok(r.raw)}});
test('JHU adult April 2025 open nephrectomy is TC 2U',()=>{const r=M.rows.find(r=>r.id==='JHU-11');a.equal(r.name,'開放性腎切除術');a.equal(r.category,'TC');a.equal(r.raw,'T/C 2U')});
test('JHU AV fistula is type and screen',()=>a.equal(M.rows.find(r=>r.id==='JHU-18').category,'TS'));
test('HTAA pints are never converted into Taiwan RBC U',()=>{const r=M.rows.find(r=>r.id==='HTAA-01');a.equal(r.raw,'6 pints');a.equal(r.taiwanUnits,null)});
test('search matches Chinese and acronym and respects specialty',()=>{a.ok(M.search('AVF','').some(r=>r.id==='JHU-18'));a.equal(M.search('腎切除','心臟外科').length,0);a.equal(M.search('不存在的術式','').length,0)});
test('N means no routine sample, not zero transfusion need',()=>{for(const r of M.rows.filter(r=>r.category==='N'))a.equal(r.taiwanUnits,null)});
