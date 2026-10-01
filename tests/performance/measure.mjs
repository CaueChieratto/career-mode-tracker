import {launch,session} from './browser.mjs';
import {chain,save} from './journeys.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync('.test-tools/performance/fixtures.json'));
const browser=await launch();
const mode=process.env.PERF_MODE||'navigation';
const expectedAsset=JSON.parse(readFileSync(`.test-tools/performance/${mode}-bundle.json`))[0].file.split('/').at(-1);
function completed(file){
  if(!existsSync(file))return false;
  const rows=JSON.parse(readFileSync(file));
  const script=rows.flatMap(r=>r.requests||[]).find(r=>r.type==='script'&&r.url.includes('/assets/'));
  if(script && !script.url.endsWith(expectedAsset))throw new Error('BUILD_CHANGED: archive the previous raw results before starting a new comparison');
  return rows.at(-1)?.name==='CareersPage: troféus'||rows.at(-1)?.censored===true;
}
const count=Number(process.env.PERF_TRIALS|| (mode==='profile'?3:5));
writeFileSync('.test-tools/performance/browser-version.json',JSON.stringify({browser:browser.version(),playwright:'1.55.1',viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,node:process.version,network:'loopback; no throttle; HTTP uncompressed; HTTP cache enabled; external connections blocked',mode},null,2));
try{
  for(const fixture of fixtures.filter(f=>!process.env.PERF_PROFILE||f.name===process.env.PERF_PROFILE)){
    // Once two independent cold sessions reproduce the large-profile login
    // timeout, preserve the evidence and stop repeating dependent chains.
    const saturation=[1,2].every(trial=>{
      const file=`.test-tools/performance/raw/navigation-large-${trial}-cold-session.json`;
      if(!existsSync(file))return false;
      return JSON.parse(readFileSync(file)).some(r=>r.name==='Login → CareersPage'&&r.censored);
    });
    if(fixture.name==='large'&&saturation){console.log('Preserved large saturation evidence; use large-targets.mjs for prepared-state diagnostics');continue;}
    for(let trial=process.env.PERF_SKIP_WARMUP==='1'?1:0;trial<=count;trial++){
      if(fixture.name==='large'&&trial>2&&[1,2].every(t=>{
        const file=`.test-tools/performance/raw/navigation-large-${t}-cold-session.json`;
        return existsSync(file)&&JSON.parse(readFileSync(file)).some(r=>r.name==='Login → CareersPage'&&r.censored);
      })){console.log('Large saturation confirmed in two independent sessions; stopping dependent chains');break;}
      const caches=mode==='profile'?['profile']:['cold-session','warm-session'];
      if(caches.every(cache=>completed(`.test-tools/performance/raw/${mode}-${fixture.name}-${trial}-${cache}.json`))) {console.log('Preserved',mode,fixture.name,trial);continue;}
      if(trial===0 && existsSync(`.test-tools/performance/raw/${mode}-${fixture.name}-0-cold-session.json`)){console.log('Preserved completed cold warmup',fixture.name);continue;}
      const s=await session(browser,mode==='profile');
      try{
        for(const cache of caches){
          if(cache==='warm-session'){
            await s.page.evaluate(async()=>{await window.__perfSignOut();localStorage.clear();});
            s.events.length=0;s.requests.length=0;s.errors.length=0;
          }
          try {
            const rows=await chain(s,fixture,{profile:fixture.name,cache,trial,mode});
            save(`${mode}-${fixture.name}-${trial}-${cache}`,rows);
          }catch(error){
            await s.flush();
            const rows=s.partialRows||[];
            if(!rows.at(-1)?.censored)rows.push({name:'Preparação interrompida',profile:fixture.name,cache,trial,mode,censored:true,limitMs:30000,reason:String(error),events:[],requests:[],errors:s.errors});
            save(`${mode}-${fixture.name}-${trial}-${cache}`,rows);
            console.log('CENSORED',fixture.name,cache,trial,String(error));
            await s.page.goto(s.origin+'/tutorial');
          }
        }
      }catch(error){await s.flush();save(`FAILED-${mode}-${fixture.name}-${trial}`,[{error:String(error),url:s.page.url(),text:await s.page.locator('body').innerText(),events:s.events,requests:s.requests,errors:s.errors}]);await s.page.screenshot({path:'.test-tools/performance/failure.png',fullPage:true});throw error;}
      finally{await s.context.close();}
    }
  }
}finally{await browser.close();}
