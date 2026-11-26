const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
let root=__dirname;while(!fs.existsSync(path.join(root,'gradlew'))){const parent=path.dirname(root);if(parent===root)throw new Error('Project root missing');root=parent;}
const localRequire=createRequire(path.join(root,'frontend/admin/package.json'));
const pw=localRequire('@playwright/test');
const siblingInfra=path.resolve(__dirname,'../../e2e-infra');
const infra=fs.existsSync(path.join(siblingInfra,'run.cjs'))?siblingInfra:path.join(root,'tests/e2e-infra');
module.exports={root,infra,pw,cli:localRequire.resolve('@playwright/test/cli'),...require(path.join(infra,'config.cjs')),fixture:require(path.join(infra,'fixtures.cjs'))};
