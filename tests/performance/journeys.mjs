import { swipeLogin } from './browser.mjs';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
const clock=page=>page.evaluate(()=>performance.timeOrigin+performance.now());
export async function capture(s,name,action,ready,meta={}){
  await s.flush();
  const begin=await clock(s.page),source=s.page.url(),before=await s.cdp.send('Performance.getMetrics');
  let usable=null,censored=false,reason=null,timer;
  const limitMs=Number(process.env.PERF_TIMEOUT_MS || 30000);
  try {
    await Promise.race([(async()=>{await action();await ready();await s.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));usable=await clock(s.page);await s.quiet();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PERF_TIMEOUT')),limitMs);})]);
  } catch(error) {censored=true;reason=String(error);}
  finally {clearTimeout(timer);}
  const end=await clock(s.page),after=await s.cdp.send('Performance.getMetrics');await s.flush();
  const events=s.events.filter(e=>e.t>=begin&&e.t<=end),requests=s.requests.filter(e=>e.t>=begin&&e.t<=end);
  const click=events.find(e=>e.kind==='click')?.t??begin;
  const metrics={};for(const m of after.metrics){const prev=before.metrics.find(x=>x.name===m.name);if(prev&&['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].includes(m.name))metrics[m.name]=(m.value-prev.value)*1000;}
  const snapshot=await s.page.evaluate(()=>({slides:[...document.querySelectorAll('.swiper-slide')].map(e=>({active:e.classList.contains('swiper-slide-active'),text:e.textContent.slice(0,65),nodes:e.querySelectorAll('*').length})),images:[...document.images].filter(e=>!e.src.startsWith('data:')).map(e=>({src:e.src,naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,complete:e.complete})),nodes:document.querySelectorAll('*').length,text:document.querySelector('#root')?.innerText?.slice(0,200),spinner:!!document.querySelector('[class*="containerLoad"]')}));
  const row={name,...meta,source,destination:s.page.url(),begin,click,readyAt:usable,usable:censored?null:usable,end,censored,limitMs,reason,metrics,events,requests,snapshot,errors:s.errors.filter(e=>e.t>=begin&&e.t<=end)};
  console.log(`${meta.profile}/${meta.cache}/${meta.trial} ${name}: ${censored?'CENSORED at '+limitMs:(usable-click).toFixed(0)}ms; ${events.filter(e=>e.kind==='read-start').length} reads`);
  return row;
}
const contentReady=page=>page.waitForFunction(()=>!document.querySelector('[class*="containerLoad"]')&&!!document.querySelector('#root')?.innerText.trim());
const nav=(page,text)=>page.locator('nav').getByText(text,{exact:true});
export async function chain(s,fixture,meta){
  const p=s.page,rows=[];
  const checkpointName=`${meta.mode}-${meta.profile}-${meta.trial}-${meta.cache}`;
  const checkpointFile=`.test-tools/performance/raw/${checkpointName}.json`;
  const previous=existsSync(checkpointFile)?JSON.parse(readFileSync(checkpointFile)):[];
  s.partialRows=rows;
  const take=async(name,action,ready)=>{
    const preserved=previous.find(r=>r.name===name&&!r.censored);
    if(preserved){await action();await ready();await s.quiet();rows.push(preserved);console.log('Preserved journey; replayed preparation',name);return preserved;}
    const row=await capture(s,name,action,ready,meta);rows.push(row);save(checkpointName,rows);if(row.censored)throw new Error(`PERF_CENSORED: ${name}`);return row;
  };
  const goto=async path=>{await p.goto(s.origin+path);await contentReady(p);await s.quiet();};
  await p.goto(s.origin);await p.getByText('Bem-vindo!',{exact:true}).waitFor();await s.quiet();
  rows.push(previous.find(r=>r.name==='Boot')||{name:'Boot',...meta,events:[...s.events],requests:[...s.requests],errors:[...s.errors]});
  await take('Entrada → Login',()=>swipeLogin(p),()=>p.locator('#email').waitFor({state:'visible'}));
  await p.locator('#email').fill(fixture.email);await p.locator('#password').fill(fixture.password);
  await take('Login → CareersPage',()=>p.getByRole('button',{name:'Entrar',exact:true}).click(),()=>p.locator('[data-drop-id="c1"]').waitFor({state:'visible'}));
  await take('CareersPage → Career',()=>p.locator('[data-drop-id="c1"]').getByRole('button',{name:'Entrar',exact:true}).click(),()=>p.getByText('Selecionar temporadas',{exact:true}).waitFor({state:'visible'}));
  await p.getByText('Temporada 1',{exact:true}).click();await p.getByRole('button',{name:'Entrar na Temporada'}).waitFor();
  await take('Career → Season',()=>p.getByRole('button',{name:'Entrar na Temporada'}).click(),()=>nav(p,'Elenco').waitFor({state:'visible'}));
  for(const title of ['Partidas','Classificação','Estatísticas','Geral']){
    await take(`Season: aba ${title}`,()=>nav(p,title).click(),async()=>{await p.waitForFunction(()=>!document.querySelector('.swiper')?.swiper?.animating);});
  }
  await nav(p,'Partidas').click();await p.getByText('Resultados',{exact:true}).click();await p.locator('.swiper-slide-active main[class*="match_row"]').first().waitFor();await s.quiet();
  await take('Season → Match',()=>p.locator('.swiper-slide-active main[class*="match_row"]').first().click(),()=>nav(p,'Resultado').waitFor({state:'visible'}));
  for(const title of ['Formações','Estatísticas'])await take(`Match: aba ${title}`,()=>nav(p,title).click(),()=>p.waitForFunction(()=>!document.querySelector('.swiper')?.swiper?.animating));
  await goto('/Career/c1/Season/s1');await nav(p,'Elenco').click();await p.locator('.swiper-slide-active').getByText('Jogador 02',{exact:true}).click();
  await p.getByText('Visualizar',{exact:true}).click();await p.getByRole('button',{name:'Entrar na Visualização'}).waitFor();
  await take('Season → Player',()=>p.getByRole('button',{name:'Entrar na Visualização'}).click(),()=>nav(p,'Jogador').waitFor({state:'visible'}));
  await goto('/Career/c1');await p.getByText('Geral',{exact:true}).click();await p.getByText('Clube',{exact:true}).click();await p.getByRole('button',{name:'Entrar no Clube'}).waitFor();
  await take('Career → Geral',()=>p.getByRole('button',{name:'Entrar no Clube'}).click(),()=>nav(p,'Elenco').waitFor({state:'visible'}));
  await take('Geral → ComparePlayers',()=>p.locator('[class*="background"] > [class*="container"] > svg').first().click(),async()=>{await p.getByText('Comparação de jogadores',{exact:true}).waitFor({state:'visible'});await p.waitForFunction(()=>window.__perfPendingReads===0);});
  await goto('/CareersPage');
  await take('CareersPage → CareerGroup',()=>p.locator('[data-drop-id="g1"] h2').first().click(),()=>nav(p,'Elenco').waitFor({state:'visible'}));
  await goto('/Career/c1/Season/s1');await nav(p,'Geral').click();await p.getByRole('button',{name:'Acessar Base'}).waitFor();
  await take('Season → Academy',()=>p.getByRole('button',{name:'Acessar Base'}).click(),()=>p.getByText('Base 01',{exact:true}).first().waitFor({state:'visible'}));
  await take('Academy: abrir jogadores',()=>p.getByRole('button',{name:'Ver todos',exact:true}).first().click(),()=>p.getByText('Base 01',{exact:true}).first().waitFor({state:'visible'}));
  await goto('/CareersPage');
  await take('CareersPage: troféus',()=>p.locator('[data-drop-id="c1"]').getByRole('button',{name:'Títulos',exact:true}).click(),()=>p.locator('img[src*="copaDoBrasil"]').waitFor({state:'visible'}));
  return rows;
}
export function save(name,rows){mkdirSync('.test-tools/performance/raw',{recursive:true});writeFileSync(`.test-tools/performance/raw/${name}.json`,JSON.stringify(rows));}
