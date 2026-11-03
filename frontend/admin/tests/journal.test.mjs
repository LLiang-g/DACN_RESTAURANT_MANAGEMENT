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

import {describeAction,journalLines,formatLogTime,localDay,shiftDay,formatDayLabel,journalTone} from '../src/utils/journal.ts';
test('log line format: [giờ ngày]tài khoản đã <Hành động> <Đối tượng> : <Chi tiết> — backend chỉ lưu chi tiết thô',()=>{
 const activities=[{id:7,createdAt:'2026-10-30T07:31:12',actorName:'admin',targetName:'Combo A',action:'update',actionName:'Cập nhật',detail:'Thêm món Bò × 2'}];
 const lines=journalLines(activities,'2026-10-30');
 assert.equal(lines.length,1);
 assert.equal(lines[0].time,'[07:31 30/10/2026]');
 assert.equal(lines[0].actor,'admin');
 assert.equal(lines[0].text,'cập nhật Combo A : Thêm món Bò × 2');
});
test('luôn in đủ "<Hành động> <Đối tượng> : <Chi tiết>" dù chi tiết là gì, kể cả trống',()=>{
 assert.equal(describeAction('Xóa','Món A',''),'xóa Món A : ');
 assert.equal(describeAction('Xóa','Món A','   '),'xóa Món A : ');
 assert.equal(describeAction('Sửa','Món A','a: b : c'),'sửa Món A : a: b : c');
 assert.equal(describeAction('Nhập kho','Thịt heo','10 kg'),'nhập kho Thịt heo : 10 kg');
 assert.equal(describeAction('Cập nhật','Gà rán','giá 40.000đ -> 45.000đ'),'cập nhật Gà rán : giá 40.000đ -> 45.000đ');
});
test('nhật ký chỉ lấy đúng ngày, mới nhất trước; thao tác kho là một dòng',()=>{
 const activities=[
  {id:1,createdAt:'2026-10-30T08:00:00',actorName:'lan',targetName:'Thịt heo',action:'import',actionName:'Nhập kho',detail:'10 kg. lô mới'},
  {id:2,createdAt:'2026-10-30T08:05:00',actorName:'lan',targetName:'Thịt heo',action:'import',actionName:'Nhập kho',detail:'5 kg'},
  {id:3,createdAt:'2026-10-29T09:00:00',actorName:'lan',targetName:'Thịt heo',action:'export',actionName:'Xuất kho',detail:'1 kg'},
 ];
 const lines=journalLines(activities,'2026-10-30');
 assert.deepEqual(lines.map(l=>l.key),['activity-2','activity-1']);
 assert.equal(lines[0].text,'nhập kho Thịt heo : 5 kg');
 assert.equal(lines[1].text,'nhập kho Thịt heo : 10 kg. lô mới');
 assert.equal(lines[1].actor,'lan');
});
test('formatLogTime và localDay',()=>{
 assert.equal(formatLogTime('2026-10-30T07:31:12'),'07:31 30/10/2026');
 assert.equal(localDay(new Date(2026,9,5)),'2026-10-05');
});

test('shiftDay lùi/tiến theo lịch, qua tháng và năm',()=>{
 assert.equal(shiftDay('2026-10-31',-1),'2026-10-30');
 assert.equal(shiftDay('2026-10-31',1),'2026-11-01');
 assert.equal(shiftDay('2026-01-01',-1),'2025-12-31');
 assert.equal(shiftDay('2028-02-28',1),'2028-02-29');
});
test('formatDayLabel có thứ và ngày đầy đủ',()=>{
 const label=formatDayLabel('2026-10-30');
 assert.ok(label.includes('30/10/2026'),label);
 assert.ok(/thứ|chủ nhật/i.test(label),label);
});
test('journalTone: thêm/xóa/sửa/khác',()=>{
 assert.equal(journalTone('create'),'add'); assert.equal(journalTone('import'),'add');
 assert.equal(journalTone('delete'),'remove'); assert.equal(journalTone('export'),'remove');
 assert.equal(journalTone('update'),'edit'); assert.equal(journalTone('adjust'),'edit');
 assert.equal(journalTone('START_COOKING'),'other');
});
test('dòng log mang theo tone để tô màu',()=>{
 const a=[{id:1,createdAt:'2026-10-30T08:00:00',actorName:'lan',targetName:'Gà rán',action:'delete',actionName:'Xóa',detail:''}];
 assert.equal(journalLines(a,'2026-10-30')[0].tone,'remove');
});
