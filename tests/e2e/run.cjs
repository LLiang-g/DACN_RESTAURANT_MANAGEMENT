const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {infra,root,cli,ports}=require('./support/runtime.cjs');
function node(file,args=[]){const r=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env:process.env});if(r.error)throw r.error;return r.status??1;}
const mode=process.argv[2]??'test';if(!['test','list','known-gaps','vnpay','auto-cancel','all'].includes(mode))throw new Error('Use test|list|known-gaps|vnpay|auto-cancel|all');
function overlay(){const state=JSON.parse(fs.readFileSync(path.join(infra,'.local/state.json')));const env={...process.env,...state,E2E_PROJECT_ROOT:root.replaceAll('\\','/'),E2E_INFRA_DIR:infra.replaceAll('\\','/'),...Object.fromEntries(Object.entries(ports).map(([k,v])=>['E2E_'+k.toUpperCase()+'_PORT',String(v)]))};const r=spawnSync(process.env.E2E_DOCKER_BIN||'docker',['compose','--project-name','restaurant-e2e','--env-file',path.join(infra,'.local/compose.env'),'-f',path.join(infra,'compose.yml'),'-f',path.join(__dirname,mode==='vnpay'?'vnpay-overlay.yml':'auto-cancel-overlay.yml'),'up','-d','--no-build'],{env,stdio:'inherit'});if(r.status!==0)throw new Error('Cannot start isolated VNPay signature profile');}
async function ready(){const {assertFixture}=require(path.join(infra,'guard.cjs'));const end=Date.now()+120000;while(Date.now()<end){try{await assertFixture();return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw new Error('E2E profile not ready');}
async function main(){
 if(mode==='all'){let failed=false;for(const suite of ['test','vnpay','auto-cancel','known-gaps'])if(node(__filename,[suite])!==0)failed=true;if(node(path.join(__dirname,'coverage.cjs'))!==0)failed=true;process.exitCode=failed?1:0;return;}
 if(mode!=='list'&&fs.existsSync(path.join(infra,'refresh-schema.cjs'))&&node(path.join(infra,'refresh-schema.cjs'),['--check'])!==0)throw new Error('E2E schema contract is out of date');
 if(mode==='list'){process.exitCode=node(cli,['test','--config',path.join(__dirname,'playwright.config.cjs'),'--list']);return;}
 const dir=path.join(infra,'.local');fs.mkdirSync(dir,{recursive:true});const lock=path.join(dir,'business-suite.lock'),nonce=crypto.randomUUID();
 if(fs.existsSync(lock)){const old=JSON.parse(fs.readFileSync(lock));let alive=true;try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}if(alive)throw new Error('Another E2E suite is running; do not reset its database');fs.unlinkSync(lock);}
 fs.writeFileSync(lock,JSON.stringify({pid:process.pid,nonce}),{flag:'wx'});let started=false;
 try{
  if(node(path.join(infra,'run.cjs'),['smoke'])!==0)throw new Error('Start E2E infrastructure before running tests');started=true;
  if(['vnpay','auto-cancel'].includes(mode)){overlay();await ready();}
  process.env.E2E_RUN_LABEL=mode;
  const selection=mode==='known-gaps'?['--grep','@known-gap']:mode==='vnpay'?['--grep','@vnpay']:mode==='auto-cancel'?['--grep','@auto-cancel']:['--grep-invert','@known-gap|@vnpay|@auto-cancel'];
  process.exitCode=node(cli,['test','--config',path.join(__dirname,'playwright.config.cjs'),...selection,...process.argv.slice(3)]);
 }finally{
  if(started){if(['vnpay','auto-cancel'].includes(mode)){if(node(path.join(infra,'run.cjs'),['up'])!==0)process.exitCode=1;}try{await require('./support/database.cjs').reset();}catch(e){console.error('E2E cleanup failed:',e.message);process.exitCode=1;}}
  if(fs.existsSync(lock)&&JSON.parse(fs.readFileSync(lock)).nonce===nonce)fs.unlinkSync(lock);
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
