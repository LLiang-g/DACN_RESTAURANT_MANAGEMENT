// Create an allowlisted server bundle. No source checkout, .env or private key is copied.
const fs=require('node:fs'),path=require('node:path');
let root=__dirname;
while(!fs.existsSync(path.join(root,'gradlew'))) {
  const parent=path.dirname(root);if(parent===root)throw new Error('Cannot locate repository');root=parent;
}
const sha=process.env.RELEASE_SHA,repository=process.env.RELEASE_REPOSITORY?.toLowerCase();
if(!/^[a-f0-9]{40}$/.test(sha??''))throw new Error('Expected full release commit SHA');
if(!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(repository??''))throw new Error('Invalid image namespace');
const digests=Object.fromEntries(['BACKEND','FRONTEND','DATABASE'].map(name=>{
  const digest=process.env[name+'_DIGEST'];
  if(!/^sha256:[a-f0-9]{64}$/.test(digest??''))throw new Error('Missing '+name+' digest');
  return [name,digest];
}));
const out=path.join(root,'release-bundle');
if(fs.existsSync(out))throw new Error('release-bundle already exists; use a clean checkout/output directory');
fs.mkdirSync(path.join(out,'deploy'),{recursive:true});
for(const [from,to] of [
  ['compose.images.yml','compose.images.yml'],
  ['deploy/Caddyfile.ip','deploy/Caddyfile.ip'],
  ['deploy/nginx.conf','deploy/nginx.conf'],
  ['deploy/nginx-routes.conf','deploy/nginx-routes.conf'],
  ['deploy/release/server.env.example','.env.example'],
  ['deploy/release/SERVER.md','README.md']
])fs.copyFileSync(path.join(root,from),path.join(out,to));
const images=Object.fromEntries(Object.entries(digests).map(([name,digest])=>[
  name+'_IMAGE',`ghcr.io/${repository}-${name.toLowerCase()}@${digest}`
]));
fs.writeFileSync(path.join(out,'images.env'),Object.entries(images).map(([k,v])=>`${k}=${v}`).join('\n')+'\n');
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify({commit:sha,repository,images},null,2)+'\n');
const source=process.env.GITHUB_STEP_SUMMARY;
if(source)fs.appendFileSync(source,`\n## Published release\n\nCommit: \`${sha}\`\n\nDownload the server bundle artifact. It contains configuration only. No automatic server deployment was performed.\n`);
console.log('Prepared server configuration bundle for commit '+sha);
