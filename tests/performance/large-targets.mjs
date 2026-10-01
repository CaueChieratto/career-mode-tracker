import {launch,session,swipeLogin} from './browser.mjs';
import {capture,save} from './journeys.mjs';
import {readFileSync,existsSync} from 'node:fs';

const file='diagnostic-large-prepared';
if(existsSync(`.test-tools/performance/raw/${file}.json`)){
  const previous=JSON.parse(readFileSync(`.test-tools/performance/raw/${file}.json`));
  if(previous.length===3){console.log('Preserved prepared large diagnostics');process.exit(0);}
  throw new Error('Partial diagnostic exists; review checkpoints before resuming');
}
const f=JSON.parse(readFileSync('.test-tools/performance/fixtures.json')).find(x=>x.name==='large');
const browser=await launch(),s=await session(browser),p=s.page,rows=[];
try{
  // Authenticate through the real UI. Do not wait for the known saturated
  // Careers hydration. A new document cancels that preparation work.
  await p.goto(s.origin);await swipeLogin(p);
  await p.locator('#email').fill(f.email);await p.locator('#password').fill(f.password);
  await p.getByRole('button',{name:'Entrar',exact:true}).click();
  await p.waitForURL('**/CareersPage');
  await p.goto(s.origin+'/tutorial');await s.quiet();
  const nav=text=>p.locator('nav').getByText(text,{exact:true});
  for(const [name,path,ready] of [
    ['Grande preparado: Group via URL','/CareerGroup/g1/Geral',()=>nav('Elenco').waitFor()],
    ['Grande preparado: Compare via URL','/Career/c1/Geral/Compare',async()=>{await p.getByText('Comparação de jogadores',{exact:true}).waitFor();await p.waitForFunction(()=>window.__perfPendingReads===0);}],
    ['Grande preparado: Player via URL','/Career/c1/Season/s1/Player/p2',()=>nav('Jogador').waitFor()],
  ]){
    rows.push(await capture(s,name,()=>p.goto(s.origin+path),ready,{profile:'large',trial:1,cache:'prepared-auth-http',mode:'diagnostic'}));
    save(file,rows);
    await p.goto(s.origin+'/tutorial');await s.quiet();
  }
}finally{save(file,rows);await s.context.close();await browser.close();}
