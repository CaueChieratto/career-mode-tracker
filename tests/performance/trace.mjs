import {launch,session,login} from './browser.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const browser=await launch();
try{
  const s=await session(browser),f=JSON.parse(readFileSync('.test-tools/performance/fixtures.json')).find(x=>x.name===(process.env.PERF_PROFILE||'large'));
  await s.cdp.send('Tracing.start',{categories:'devtools.timeline,v8,v8.execute,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-v8.compile',transferMode:'ReturnAsStream'});
  await login(s,f);await s.page.goto(s.origin+'/Career/c1/Geral');await s.page.locator('nav').getByText('Elenco',{exact:true}).waitFor();await s.quiet();
  await s.page.locator('nav').getByText('Partidas',{exact:true}).click();await s.quiet();
  const complete=new Promise(resolve=>s.cdp.once('Tracing.tracingComplete',resolve));
  await s.cdp.send('Tracing.end');const {stream}=await complete;
  let data='';while(true){const part=await s.cdp.send('IO.read',{handle:stream});data+=part.data;if(part.eof)break;}await s.cdp.send('IO.close',{handle:stream});
  writeFileSync('.test-tools/performance/chrome-trace.json.gz',gzipSync(data));
  const events=JSON.parse(data).traceEvents;
  const mainThreads=new Set(events.filter(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain').map(e=>`${e.pid}:${e.tid}`));
  const totals={};for(const e of events.filter(e=>e.ph==='X'&&mainThreads.has(`${e.pid}:${e.tid}`))){const entry=totals[e.name]??={count:0,totalMs:0,maxMs:0};entry.count++;entry.totalMs+=(e.dur||0)/1000;entry.maxMs=Math.max(entry.maxMs,(e.dur||0)/1000);}
  writeFileSync('.test-tools/performance/trace-summary.json',JSON.stringify({profile:f.name,sampleCount:1,scenario:'login + direct Geral + tab Partidas',note:'Durations overlap across nested categories; do not sum them as exclusive CPU time.',mainThreads:[...mainThreads],events:Object.entries(totals).map(([name,value])=>({name,...value})).sort((a,b)=>b.totalMs-a.totalMs)},null,2));
}finally{await browser.close();}
