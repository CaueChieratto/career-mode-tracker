import { chromium } from '../performance-tools/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
export async function launch(){return chromium.launch({executablePath:process.env.PERF_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--proxy-server=http://127.0.0.1:1','--proxy-bypass-list=127.0.0.1;localhost','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']});}
export async function session(browser,profile=false){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'pt-BR',timezoneId:'America/Sao_Paulo',serviceWorkers:'block'});
  const events=[],requests=[],errors=[];
  await context.exposeBinding('__perfSink',(_,batch)=>events.push(...batch));
  await context.addInitScript({path:'tests/performance/browser-init.js'});
  await context.addInitScript({content:readFileSync('tests/performance-tools/node_modules/web-vitals/dist/web-vitals.iife.js','utf8')+'; for(const name of ["onFCP","onLCP","onCLS","onINP"]) webVitals[name](m=>__perfEmit({kind:"vital",name:m.name,value:m.value,id:m.id}),{reportAllChanges:true});'});
  context.on('request',r=>requests.push({t:Date.now(),url:r.url(),method:r.method(),type:r.resourceType()}));
  const page=await context.newPage();page.setDefaultTimeout(Number(process.env.PERF_TIMEOUT_MS || 30000));
  page.on('pageerror',e=>errors.push({t:Date.now(),message:e.message}));
  page.on('dialog',d=>{errors.push({t:Date.now(),message:d.message()});d.dismiss();});
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  const origin=`http://127.0.0.1:${profile?4180:4179}`;
  const flush=async()=>{try{events.push(...await page.evaluate(()=>window.__perfEvents.splice(0)));}catch{}};
  const quiet=async()=>{
    const quietLimit=Number(process.env.PERF_TIMEOUT_MS || 30000);
    await page.waitForFunction(()=>!document.querySelector('[class*="containerLoad"]') && document.querySelector('#root')?.innerText.trim().length>0,{},{timeout:quietLimit});
    const quietStart=Date.now();let last=Date.now(),length=-1;
    for(let i=0;i<1800;i++){
      await flush();
      const currentOrigin=events.findLast(x=>x.kind==='document-start')?.origin;
      const relevant=events.filter(e=>e.origin===currentOrigin && ['read-start','read-end','read-error','listen-callback','content'].includes(e.kind));
      const pending=relevant.filter(e=>e.kind==='read-start').length-relevant.filter(e=>['read-end','read-error'].includes(e.kind)).length;
      if(relevant.length!==length){last=Date.now();length=relevant.length;}
      const visible=await page.evaluate(()=>!document.querySelector('[class*="containerLoad"]') && !!document.querySelector('#root')?.innerText.trim());
      if(pending===0 && visible && Date.now()-last>=400)break;
      if(Date.now()-quietStart>=quietLimit)throw new Error('Data did not settle within observation limit');
      await page.waitForTimeout(100);
    }
    await flush();
  };
  return {context,page,cdp,events,requests,errors,origin,quiet,flush};
}
export async function swipeLogin(page){
  const count=await page.locator('.swiper-slide').count();
  for(let i=1;i<count;i++){
    await page.mouse.move(340,400);await page.mouse.down();await page.mouse.move(50,400,{steps:12});await page.mouse.up();await page.waitForTimeout(350);
  }
}
export async function login(s,fixture){
  await s.page.goto(s.origin);await swipeLogin(s.page);
  await s.page.locator('#email').fill(fixture.email);await s.page.locator('#password').fill(fixture.password);
  await s.page.getByRole('button',{name:'Entrar',exact:true}).click();await s.quiet();
}
