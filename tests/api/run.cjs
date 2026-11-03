const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
process.chdir(__dirname);
const mode = process.argv[2] || 'test';
if (!['up', 'down', 'test', 'all'].includes(mode)) throw new Error('Use up, down, test or all');
function compose(args) {
  const r = spawnSync('docker', ['compose', '-f', 'compose.yml', ...args], {stdio:'inherit'});
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('Docker compose failed: '+r.status);
}
async function main() {
  if (mode === 'down') { compose(['down', '--remove-orphans']); return; }
  if (['up','all'].includes(mode)) {
    // Fixed project name dacn-api-test and separate compose file: never touch the app stack.
    compose(['down', '--remove-orphans']);
    compose(['up', '--build', '-d']);
  }
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch('http://localhost:18080/api/customer/tables/900002', {signal:AbortSignal.timeout(2000)});
      if (r.ok && (await r.json()).id === 900002) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Test backend not ready. Run npm run up; inspect docker compose -f compose.yml logs.');
  if (mode === 'up') { console.log('Postman test backend ready: http://localhost:18080'); return; }
  const newman = require('newman');
  const collection = JSON.parse(fs.readFileSync('Smart-POS.postman_collection.json'));
  const environment = JSON.parse(fs.readFileSync('Local-Test.postman_environment.json'));
  await new Promise((resolve,reject) => newman.run({collection,environment,reporters:['cli'],timeoutRequest:15000,timeoutScript:10000}, (err, summary) => {
    if (err) return reject(err);
    // Export only checks, method/path, status and timing. Do not persist JWTs or credentials.
    const report = {date:new Date().toISOString(),stats:summary.run.stats,requests:summary.run.executions.map(e => ({
      name:e.item.name,method:e.request.method,path:e.request.url.getPath(),status:e.response?.code,
      durationMs:e.response?.responseTime,error:e.requestError?.message,
      scriptErrors:summary.run.failures.filter(f=>f.source?.id === e.item.id).map(f=>f.error?.message),
      assertions:(e.assertions||[]).map(a => ({name:a.assertion,passed:!a.error,error:a.error?.message}))
    })), failures:summary.run.failures.map(f => ({name:f.source?.name,test:f.error?.test,message:f.error?.message}))};
    fs.mkdirSync('results',{recursive:true});
    fs.writeFileSync('results/report.json', JSON.stringify(report,null,2)+'\n');
    const rows=report.requests.map(r => `| ${r.assertions.some(a=>!a.passed)||r.error||r.scriptErrors.length||!r.status?'FAIL':'PASS'} | ${r.method} | ${r.path} | ${r.status??'No response'} | ${r.name} |`);
    const text = ['# API test report', '', report.date, '', `${report.stats.requests.total} requests; ${report.stats.assertions.total} assertions; ${report.failures.length} failures.`, '', '| Result | Method | Path | HTTP | Scenario |','|---|---|---|---|---|',...rows, '', '## Failures', '', ...report.failures.map(f=>`- ${f.name}: ${f.test||''} ${f.message}`)].join('\n');
    fs.writeFileSync('results/report.md', text+'\n');
    console.log('Report:',path.join(__dirname,'results/report.md'));
    if (report.failures.length || report.stats.requests.failed || report.stats.requests.total !== collection.item.reduce((n,f)=>n+f.item.length,0)) process.exitCode=1;
    resolve();
  }));
}
main().catch(e=>{ console.error(e.message); process.exitCode=1; });
