const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {pw,root,infra,fixture,urls}=require('./runtime.cjs');const {json,assertFixture}=require(path.join(infra,'guard.cjs'));
const {sql,reset}=require('./database.cjs');
const assert=require('node:assert/strict');
async function response(route,{role='pos',method='GET',data,headers={}}={}){const token=role?tokens[role]:null;return fetch(urls.api+route,{method,headers:{'Content-Type':'application/json',Connection:'close',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});}
let tokens={};
async function api(route,options={}){const r=await response(route,options);if(!r.ok){let b;try{b=await r.json();}catch{}throw new Error(`${options.method??'GET'} ${route}: HTTP ${r.status} ${b?.code??''}`);}const text=await r.text();return text?JSON.parse(text):null;}
async function authenticate(){tokens={};for(const [key,username] of Object.entries(fixture.users)){const r=await response(key==='admin'?'/api/admin/auth/login':'/api/auth/login',{role:null,method:'POST',data:{username,password:fixture.password}});assert.equal(r.status,200);tokens[key]=(await r.json()).token;}}
async function order({tableId=900002,foodId=900001,quantity=1,optionIds=[],combos=[],key=crypto.randomUUID()}={}){return api('/api/customer/orders',{role:null,method:'POST',headers:{'Idempotency-Key':key},data:{tableId,items:foodId?[{foodId,quantity,optionIds}]:[],combos}});}
async function items(invoiceId){const d=await api('/api/pos/invoices/'+invoiceId);return [...d.items,...d.combos.flatMap(c=>c.items)];}
async function itemId(invoiceId){return (await items(invoiceId))[0].orderItemId;}
async function approve(id){return api('/api/pos/order-items/'+id+'/approve',{method:'PATCH'});}
async function cooked({served=false,...options}={}){const o=await order(options),id=await itemId(o.invoiceId);await approve(id);await api('/api/kds/items/'+id+'/start',{role:'hot',method:'POST'});await api('/api/kds/items/'+id+'/finish',{role:'hot',method:'POST'});if(served)await api('/api/pos/order-items/'+id+'/served',{method:'PATCH'});return {...o,id};}
async function receive(invoiceId,overrides={}){return api('/api/pos/invoices/'+invoiceId+'/collection',{method:'POST',data:{requestKey:crypto.randomUUID(),source:'CASH',amount:20000,reference:'',txnRef:'',providerTxnNo:'',note:'E2E cash received',bankVerified:false,confirmed:true,...overrides}});}
async function login(page,kind='pos',password=fixture.password){const url=kind==='admin'?urls.admin:kind==='pos'?urls.pos:urls.kds;await page.goto(url);await page.locator('input:not([type="password"])').first().fill(fixture.users[kind]);await page.locator('input[type="password"]').fill(password);await page.locator('form button[type="submit"]').click();if(password===fixture.password)await pw.expect(page.locator('input[type="password"]')).toHaveCount(0);}
async function customer(page,tableId=900002){await page.goto(urls.customer+'/?table='+tableId);await pw.expect(page.getByRole('heading',{name:'Thực đơn tại bàn',exact:true})).toBeVisible();}
async function addFood(page,option=false){await page.getByRole('button',{name:'Chọn món E2E main food',exact:true}).click();if(option)await page.getByRole('dialog').getByText('E2E extra portion',{exact:false}).click();await page.getByRole('dialog').getByRole('button',{name:/^Thêm ·/}).click();}
async function sendCart(page){await page.getByRole('button',{name:/Xem giỏ món/}).click();await page.getByRole('button',{name:/Gửi đơn gọi món/}).click();await pw.expect(page.getByRole('dialog',{name:'Nhà hàng đã nhận đơn'})).toBeVisible();}
async function pending(page){await page.locator('.pos-navigation').getByRole('button',{name:/Duyệt/}).click();}
async function openInvoice(page){await page.getByRole('button',{name:/Bàn E02, E2E,.*mở hóa đơn/}).click();await pw.expect(page.locator('.invoice-modal')).toBeVisible();return page.locator('.invoice-modal');}
const test=pw.test.extend({_isolate:[async({},use)=>{await reset();await authenticate();await use();},{auto:true}]});
module.exports={test,expect:pw.expect,sql,api,response,order,items,itemId,approve,cooked,receive,fixture,urls,tokens:()=>tokens,login,customer,addFood,sendCart,pending,openInvoice};
