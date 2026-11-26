// DDL-only contract generator. Never reads .env or copies sample rows.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let root=__dirname;while(!fs.existsSync(path.join(root,'gradlew'))){const parent=path.dirname(root);if(parent===root)throw new Error('Project root missing');root=parent;}
const relative='database/init/sample_database.26.11.22.sql',file=path.join(root,relative),bytes=fs.readFileSync(file),text=bytes.toString('utf8').replaceAll('\r\n','\n');
const blocks=text.match(/^CREATE TABLE\b[\s\S]*?;/gm)||[];if(blocks.length<20)throw new Error('Unexpected source DDL; review generator before use');
const schema='-- E2E schema contract: DDL only, never demo data.\n-- Source: '+relative+' sha256='+crypto.createHash('sha256').update(text).digest('hex')+'\n\n'+blocks.join('\n\n')+'\n';
if(/^(INSERT|USE|CREATE DATABASE)\b/im.test(schema))throw new Error('Refusing to copy data/database selection');
const tables=new Set([...schema.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+`?(\w+)/g)].map(m=>m[1]));
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.java'))for(const m of fs.readFileSync(f,'utf8').matchAll(/@Table\(\s*name\s*=\s*"(\w+)"/g))tables.add(m[1]);}}
walk(path.join(root,'src/main/java'));
const reset='-- ONLY restaurant_e2e: reset fixture data after Hibernate update, before seed.\nSET FOREIGN_KEY_CHECKS=0;\n'+[...tables].sort().map(t=>'TRUNCATE TABLE `'+t+'`;').join('\n')+'\nSET FOREIGN_KEY_CHECKS=1;\n';
for(const [name,content] of [['schema-base.sql',schema],['boot-reset.sql',reset]]){const target=path.join(__dirname,name);if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8').replaceAll('\r\n','\n')!==content.replaceAll('\r\n','\n'))throw new Error(name+' out of date; review and refresh E2E schema');}else fs.writeFileSync(target,content);}
console.log('E2E schema contract '+(process.argv.includes('--check')?'verified':'updated')+' ('+blocks.length+' CREATE TABLE statements, zero sample INSERTs)');
