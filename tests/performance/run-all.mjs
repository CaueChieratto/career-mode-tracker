import {spawn} from 'node:child_process';
await import('./measure.mjs');
async function run(file,extra={}){
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,...extra}});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${file}: ${code}`)));
  });
}
await run('tests/performance/measure.mjs',{PERF_MODE:'profile',PERF_TRIALS:'3'});
await run('tests/performance/large-targets.mjs');
await run('tests/performance/advanced.mjs',{PERF_PROFILE:'small'});
await run('tests/performance/advanced.mjs',{PERF_PROFILE:'medium'});
// The large profile cannot reach these screens within the observation limit.
// Keep focused diagnostics on the same reachable medium fixture.
await run('tests/performance/compare.mjs',{PERF_PROFILE:'medium'});
await run('tests/performance/trace.mjs',{PERF_PROFILE:'medium'});
await run('tests/performance/action.mjs',{PERF_PROFILE:'medium'});
await run('tests/performance/summarize.mjs');
await run('tests/performance/report.mjs');
