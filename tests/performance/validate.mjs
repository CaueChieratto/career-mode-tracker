import {spawn} from 'node:child_process';
import {mkdirSync,createWriteStream,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

// Run only after the benchmark server/emulators have stopped.
const out='.test-tools/performance/validation';
mkdirSync(out,{recursive:true});
const results=[];
async function run(label,executable,args){
  const start=new Date(),log=createWriteStream(`${out}/${label.replaceAll(':','-')}.log`);
  console.log('VALIDATE',label);
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});
    for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{process.stdout.write(data);log.write(data);});
    child.on('error',reject);child.on('exit',resolve);
  });
  await new Promise(resolve=>log.end(resolve));
  const output=readFileSync(`${out}/${label.replaceAll(':','-')}.log`,'utf8').replace(/\x1b\[[0-9;]*m/g,'');
  const summary=output.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^(Test Files|Tests)\s+\d/.test(x));
  results.push({command:label,exitCode:code,summary,startedAt:start.toISOString(),finishedAt:new Date().toISOString()});
  writeFileSync('docs/performance/validation.json',JSON.stringify({results},null,2));
  if(code!==0)throw new Error(`Validation failed: ${label} (${code}); inspect ${out}`);
}
for(const script of ['typecheck','typecheck:tests','lint','test:run','test:integration','test:coverage:all','build']){
  if(process.platform==='win32')await run(script,process.env.ComSpec||'cmd.exe',['/d','/s','/c',`npm run ${script}`]);
  else await run(script,'npm',['run',script]);
}
for(const file of readdirSync('tests/performance').filter(x=>/\.(mjs|cjs|js)$/.test(x)))await run(`syntax-${file}`,process.execPath,['--check',`tests/performance/${file}`]);
await run('source-integrity',process.execPath,['tests/performance/verify-source.mjs']);
await run('git-diff-check','git',['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`,'diff','--check']);
const coverage=JSON.parse(readFileSync('coverage/coverage-summary.json')).total;
const productionBuild=readdirSync('dist/assets').filter(name=>/\.(js|css)$/.test(name)).map(name=>{const body=readFileSync(`dist/assets/${name}`);return {name,bytes:body.length,gzip:gzipSync(body).length,sha256:createHash('sha256').update(body).digest('hex')};});
writeFileSync('docs/performance/validation.json',JSON.stringify({generatedAt:new Date().toISOString(),results,coverage,productionBuild,sourceIntegrity:JSON.parse(readFileSync('docs/performance/source-integrity.json'))},null,2));
