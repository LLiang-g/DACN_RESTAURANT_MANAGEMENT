const {test,expect,urls,tokens,order,itemId,approve,api}=require('../support/fixture.cjs');

// Raw STOMP browser transport: no dependency on the UI's token injection.
async function open(page,topic,token,{send=false}={}) {
  await page.goto(urls.customer+'/?table=900002');
  await page.evaluate(({topic,token,send})=>{
    window.__wsFrames=[];
    const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws/websocket`);
    window.__securitySocket=socket;
    socket.onopen=()=>socket.send(`CONNECT\naccept-version:1.2\nheart-beat:0,0\n${token?`Authorization:Bearer ${token}\n`:''}\n\0`);
    socket.onmessage=event=>{
      const frame=String(event.data);window.__wsFrames.push(frame);
      if(frame.startsWith('CONNECTED'))socket.send(send
        ?`SEND\ndestination:${topic}\n\nforged-test-event\0`
        :`SUBSCRIBE\nid:security\ndestination:${topic}\n\n\0`);
    };
    socket.onclose=()=>window.__wsFrames.push('CLOSED');
    socket.onerror=()=>window.__wsFrames.push('ERROR');
  },{topic,token,send});
}
async function expectDenied(page) {
  await expect.poll(()=>page.evaluate(()=>window.__wsFrames.some(f=>f.startsWith('ERROR')||f==='CLOSED'))).toBe(true);
  expect(await page.evaluate(()=>window.__wsFrames.some(f=>f.startsWith('RECEIPT')||f.startsWith('MESSAGE')))).toBe(false);
}
async function expectDelivery(page) {
  await expect.poll(()=>page.evaluate(()=>window.__wsFrames.some(f=>f.startsWith('CONNECTED')))).toBe(true);
  // SimpleBroker has no receipt support: verify real application events instead.
  // Retry the trigger only if subscription registration raced the first trigger.
  await expect(async()=>{
    const o=await order(),id=await itemId(o.invoiceId);await approve(id);
    await api('/api/kds/items/'+id+'/start',{role:'hot',method:'POST'});
    await expect.poll(()=>page.evaluate(()=>window.__wsFrames.some(f=>f.startsWith('MESSAGE'))),{timeout:1500}).toBe(true);
  }).toPass({timeout:15000});
  expect(await page.evaluate(()=>window.__wsFrames.some(f=>f.startsWith('ERROR')||f==='CLOSED'))).toBe(false);
}

test('[AUTH-06] guest cannot receive real POS events',async({page})=>{
  await open(page,'/topic/pos');await expectDenied(page);
  const o=await order();await approve(await itemId(o.invoiceId));
  expect(await page.evaluate(()=>window.__wsFrames.some(f=>f.startsWith('MESSAGE')))).toBe(false);
});
test('[AUTH-06] POS JWT receives real event after subscription',async({page})=>{
  await open(page,'/topic/pos',tokens().pos);await expectDelivery(page);
});
test('[AUTH-06] guest table notification remains available',async({page})=>{
  await open(page,'/topic/table/900002');await expectDelivery(page);
});
for(const [role,topic] of [['hot','/topic/kds'],['admin','/topic/pos'],['admin','/topic/kds'],['admin','/topic/admin/activity']]) {
  test(`[AUTH-06] ${role} may subscribe ${topic}`,async({page})=>{
    await open(page,topic,tokens()[role]);await expectDelivery(page);
  });
}
for(const [role,topic] of [['hot','/topic/pos'],['pos','/topic/admin/activity'],['pos','/topic/kds'],['pos','/topic/**']]) {
  test(`[AUTH-06] ${role} cannot subscribe ${topic}`,async({page})=>{
    await open(page,topic,tokens()[role]);await expectDenied(page);
  });
}
test('[AUTH-06] malformed JWT rejected on CONNECT',async({page})=>{
  await open(page,'/topic/pos','invalid-test-token');await expectDenied(page);
});
test('[AUTH-06] authenticated client cannot publish a forged event',async({page})=>{
  await open(page,'/topic/pos',tokens().admin,{send:true});await expectDenied(page);
});
