import {launch,session,login} from './browser.mjs';
import {capture,save} from './journeys.mjs';
import {readFileSync,existsSync} from 'node:fs';
const browser=await launch(),fixture=JSON.parse(readFileSync('.test-tools/performance/fixtures.json')).find(x=>x.name===(process.env.PERF_PROFILE||'large'));
try{
  const checkpoint=`diagnostic-compare-selection-${fixture.name}`;
  const rows=existsSync(`.test-tools/performance/raw/${checkpoint}.json`)?JSON.parse(readFileSync(`.test-tools/performance/raw/${checkpoint}.json`)):[];
  for(let trial=1;trial<=3;trial++){
    if(rows.filter(r=>r.trial===trial&&r.name.startsWith('Compare: selecionar')&&!r.censored).length===2){console.log('Preserved compare trial',trial);continue;}
    const s=await session(browser,true),p=s.page;
    try{
      await login(s,fixture);await p.goto(s.origin+'/Career/c1/Geral/Compare');await p.getByText('Comparação de jogadores',{exact:true}).waitFor();await s.quiet();await p.waitForTimeout(700);await s.flush();
      const origin=s.events.findLast(e=>e.kind==='document-start').origin;
      if(!rows.some(r=>r.trial===trial&&r.name==='Compare: timers até depois dos dados'))rows.push({name:'Compare: timers até depois dos dados',profile:fixture.name,trial,mode:'diagnostic',begin:origin,click:origin,events:s.events.filter(e=>e.origin===origin),requests:s.requests.filter(e=>e.t>=origin),errors:s.errors});
      save(`diagnostic-compare-selection-${fixture.name}`,rows);
      for(const [slot,player] of [[0,'Jogador 02 - ATA'],[1,'Jogador 03 - ATA']]){
        await p.locator('[class*="playerCard"]').nth(slot).click();
        await p.locator('input[name="playerSelection"]').click();
        await p.getByText(player,{exact:true}).waitFor();
        rows.push(await capture(s,`Compare: selecionar jogador ${slot+1}`,()=>p.getByText(player,{exact:true}).click(),()=>p.locator('[class*="playerCard"]').nth(slot).getByText('Trocar jogador',{exact:true}).waitFor(),{profile:fixture.name,trial,mode:'diagnostic'}));
        save(`diagnostic-compare-selection-${fixture.name}`,rows);
      }
    }finally{save(`diagnostic-compare-selection-${fixture.name}`,rows);await s.context.close();}
  }
  save(`diagnostic-compare-selection-${fixture.name}`,rows);
}finally{await browser.close();}
