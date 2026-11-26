const assert=require('node:assert/strict');
const fixture=require('./fixtures.cjs');
const api=require('./config.cjs').urls.api;
async function json(route,options={}) {
  const response=await fetch(api+route,{...options,headers:{Connection:'close',...options.headers},signal:AbortSignal.timeout(10000)});
  const body=await response.json();
  if(!response.ok)throw new Error(`E2E ${route}: HTTP ${response.status} (${body.code??'unknown'})`);
  return body;
}
async function login(username) {
  return json('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:fixture.password})});
}
async function assertFixture() {
  // Data marker AND role checks, in addition to Docker identity checked by run.cjs.
  const account=await json('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fixture.users.admin,password:fixture.password})});
  const category=await json('/api/admin/categories/'+fixture.ids.hotCategory,{headers:{Authorization:'Bearer '+account.token}});
  assert.equal(category.name,fixture.marker,'Not the isolated seeded database');
  const pos=await login(fixture.users.pos);assert.equal(pos.role,'RECEPTIONIST');assert(pos.token);
  const hot=await login(fixture.users.hot);assert.equal(hot.role,'KITCHEN');assert(hot.token);
  return {account,pos,hot};
}
module.exports={api,json,login,assertFixture};
