// No shell commands, no root .env, no arbitrary target URL/project name.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {ports,urls}=require('./config.cjs');
const infra=__dirname,projectName='restaurant-e2e',scope='e2e-v1';
let root=infra;
while(!fs.existsSync(path.join(root,'gradlew'))){const parent=path.dirname(root);if(parent===root)throw new Error('Cannot locate project root');root=parent;}
const local=path.join(infra,'.local');fs.mkdirSync(local,{recursive:true});
const stateFile=path.join(local,'state.json'),envFile=path.join(local,'compose.env');
function state(){
 if(fs.existsSync(stateFile))return JSON.parse(fs.readFileSync(stateFile,'utf8'));
 const s={E2E_DB_ROOT_PASSWORD:crypto.randomBytes(24).toString('hex'),E2E_DB_PASSWORD:crypto.randomBytes(24).toString('hex'),E2E_JWT_SECRET:crypto.randomBytes(48).toString('base64'),E2E_MOCK_SECRET:crypto.randomBytes(32).toString('hex')};
 fs.writeFileSync(stateFile,JSON.stringify(s,null,2),{mode:0o600});return s;
}
const settings=state();fs.writeFileSync(envFile,Object.entries(settings).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
const env={...process.env,...settings,...Object.fromEntries(Object.entries(ports).map(([k,v])=>['E2E_'+k.toUpperCase()+'_PORT',String(v)])),E2E_PROJECT_ROOT:root.replaceAll('\\','/'),E2E_INFRA_DIR:infra.replaceAll('\\','/')};
const docker=process.env.E2E_DOCKER_BIN||'docker';
function exec(args,capture=false){const r=spawnSync(docker,args,{cwd:infra,env,encoding:'utf8',stdio:capture?'pipe':'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error('Docker command failed ('+r.status+'): '+(capture?r.stderr:'see output'));return capture?r.stdout.trim():'';}
function compose(args,capture=false){return exec(['compose','--project-name',projectName,'--env-file',envFile,'-f',path.join(infra,'compose.yml'),...args],capture);}
function identity(){
 const ids=exec(['ps','-aq','--filter','label=com.docker.compose.project='+projectName],true).split(/\s+/).filter(Boolean);
 for(const id of ids){const [c]=JSON.parse(exec(['inspect',id],true));if(c.Config.Labels['com.restaurant.test-scope']!==scope)throw new Error('Refusing operation: resource without E2E ownership marker');}
 return ids;
}
async function smoke(){
 const ids=identity();if(ids.length!==3)throw new Error('Expected exactly three isolated E2E containers');
 for(const id of ids){const [container]=JSON.parse(exec(['inspect',id],true));if(!container.State.Running)throw new Error('E2E container is not running');}
 const backend=compose(['ps','-q','backend'],true);if(!backend)throw new Error('No E2E backend');
 const [c]=JSON.parse(exec(['inspect',backend],true));
 const binding=c.NetworkSettings.Ports['8080/tcp'];if(!binding?.some(b=>b.HostIp==='127.0.0.1'&&b.HostPort===String(ports.api)))throw new Error('Unexpected E2E backend port binding');
 if(!c.Config.Env.includes('SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/restaurant_e2e?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh'))throw new Error('Unexpected database URL');
 const {json,assertFixture}=require('./guard.cjs');const fixture=require('./fixtures.cjs');const assert=require('node:assert/strict');
 const auth=await assertFixture();
 const bar=await json('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fixture.users.bar,password:fixture.password})});assert.equal(bar.role,'KITCHEN');
 const menu=await json('/api/customer/menu');const foods=menu.categories.flatMap(c=>c.foods);assert(foods.some(f=>f.id===fixture.ids.mainFood&&f.price===20000));assert.equal(foods.find(f=>f.id===fixture.ids.soldOutFood)?.available,false);
 const table=await json('/api/customer/tables/'+fixture.ids.table);assert.equal(table.id,fixture.ids.table);
 for(const port of [ports.customer,ports.pos,ports.kds,ports.admin]){const r=await fetch('http://127.0.0.1:'+port,{signal:AbortSignal.timeout(10000)});assert.equal(r.status,200);assert((await r.text()).includes('<div id="root">'));
 const proxied=await fetch('http://127.0.0.1:'+port+'/api/customer/menu',{signal:AbortSignal.timeout(10000)});assert.equal(proxied.status,200);assert((await proxied.json()).categories.some(c=>c.name===fixture.marker));
 const ws=await fetch('http://127.0.0.1:'+port+'/ws/info',{signal:AbortSignal.timeout(10000)});assert.equal(ws.status,200);assert.equal((await ws.json()).websocket,true);}

 assert.equal((await fetch(urls.api+'/api/pos/tables',{signal:AbortSignal.timeout(10000)})).status,401);
 assert.equal((await fetch(urls.api+'/api/admin/foods',{headers:{Authorization:'Bearer '+auth.pos.token},signal:AbortSignal.timeout(10000)})).status,403);
 const directory=path.join(infra,'results');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'environment-smoke.json'),JSON.stringify({date:new Date().toISOString(),passed:true,checks:['docker ownership + database URL','fixture marker','four account logins','menu + sold-out fixture','table fixture','four frontend pages + API proxy + SockJS info','unauthenticated + wrong-role rejection'],note:'Environment smoke only, not business E2E. No tokens exported.'},null,2));
 console.log('E2E environment smoke PASS.',urls);
}
async function ready(){const {assertFixture}=require('./guard.cjs');const end=Date.now()+180000;while(Date.now()<end){try{await assertFixture();return;}catch{}await new Promise(r=>setTimeout(r,1500));}throw new Error('E2E backend not ready; run logs');}
async function main(){
 const mode=process.argv[2]||'help';
 if(!['up','smoke','down','reset','logs','config','export-postman','help'].includes(mode))throw new Error('Unknown command');
 if(mode==='help'){console.log('node tests/e2e-infra/run.cjs up|smoke|down|reset|logs|config|export-postman');return;}
 if(mode==='config'){console.log(compose(['config','--quiet'],true)||'Compose config valid');return;}
 identity();
 if(mode==='logs'){compose(['logs','--tail','100']);return;}
 if(mode==='down'){compose(['down']);return;}
 if(mode==='export-postman'){
  await smoke();const fixture=require('./fixtures.cjs');const values={baseUrl:urls.api,posUsername:fixture.users.pos,posPassword:fixture.password,kitchenUsername:fixture.users.hot,kitchenPassword:fixture.password,adminUsername:fixture.users.admin,adminPassword:fixture.password,tableId:String(fixture.ids.table),foodId:String(fixture.ids.mainFood),allowMutations:'true',mockWebhookSecret:settings.E2E_MOCK_SECRET};
  fs.writeFileSync(path.join(local,'E2E.postman_environment.json'),JSON.stringify({name:'ISOLATED E2E ONLY',values:Object.entries(values).map(([key,value])=>({key,value,enabled:true,type:/password|secret/i.test(key)?'secret':'default'})),_postman_variable_scope:'environment'},null,2));console.log('Exported .local/E2E.postman_environment.json. Use only with the E2E stack.');return;
 }
 if(mode==='reset'){compose(['down']);}
 if(mode==='up'||mode==='reset'){compose(['up','-d','--build']);await ready();}
 await smoke();
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
