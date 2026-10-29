import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journalRows,filterJournal} from '../src/utils/journal.ts';
test('merged journal sorts newest first, keeps same IDs from separate sources, filters calendar day',()=>{
 const activities=[{id:1,createdAt:'2026-10-29T09:00:00',actorName:'nam',targetName:'Bò xào',action:'create',actionName:'Thêm',detail:''}];
 const stock=[{id:1,createdAt:'2026-10-30T08:00:00',ingredient:{name:'Thịt bò',unit:'kg'},quantity:2,type:'IMPORT',note:''}];
 const rows=journalRows(activities,stock);
 assert.deepEqual(rows.map(r=>r.key),['stock-1','activity-1']);
 assert.equal(filterJournal(rows,'2026-10-29').length,1);
 assert.equal(filterJournal(rows,'2026-10-28').length,0);
 assert.ok(rows.every(r=>r.detail.trim().length>0));
 assert.equal(rows[1].actor,'nam');
});
