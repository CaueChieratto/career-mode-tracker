import {launch,session,login} from './browser.mjs';
import {capture,save} from './journeys.mjs';
import {base,request,fields} from './seed.mjs';
import {readFileSync,existsSync} from 'node:fs';
const browser=await launch(),fixture=JSON.parse(readFileSync('.test-tools/performance/fixtures.json')).find(x=>x.name===(process.env.PERF_PROFILE||'large'));
async function restoreSyntheticWrite(){
  const cp=`${base}/users/${fixture.uid}/careers/c1`,matches=await request(`${cp}/seasons/s1/matches?pageSize=1000`);
  for(const doc of matches.documents||[])if(doc.fields.awayTeam?.stringValue==='Rival Sintetico Novo'||doc.fields.homeTeam?.stringValue==='Rival Sintetico Novo')await request(`http://127.0.0.1:8089/v1/${doc.name}`,{method:'DELETE'});
  const c=await request(cp);
  for(const season of c.fields.clubData.arrayValue.values)if(season.mapValue.fields.id.stringValue==='s1')season.mapValue.fields.teams=fields({teams:[{name:'Rival',badge:'/Logo.png',leagueName:'Brasileirão'}]}).teams;
  await request(cp+'?updateMask.fieldPaths=clubData&updateMask.fieldPaths=updatedAt',{method:'PATCH',body:JSON.stringify({fields:{clubData:c.fields.clubData,...fields({updatedAt:1700000000000})}})});
}
try{
  const checkpoint=`.test-tools/performance/raw/diagnostic-save-action-${fixture.name}.json`;
  const rows=existsSync(checkpoint)?JSON.parse(readFileSync(checkpoint)):[];
  for(let trial=1;trial<=3;trial++){
    if(rows.some(r=>r.trial===trial&&!r.censored)){console.log('Preserved save sample',trial);continue;}
    const s=await session(browser),p=s.page;
    try{
      await login(s,fixture);await p.goto(s.origin+'/Career/c1/Season/s1');await p.locator('nav').getByText('Partidas',{exact:true}).click();
      await p.getByRole('button',{name:'Adicionar partida'}).click();await s.quiet();
      await p.locator('#date').fill('15/11');await p.getByText('Selecione...',{exact:true}).click();await p.getByText('Brasileirão',{exact:true}).click();await p.locator('input[name="opponentTeam"]').fill('Rival Sintetico Novo');
      rows.push(await capture(s,'Salvar partida: clique → feedback',()=>p.locator('nav').getByText('Salvar',{exact:true}).click(),()=>p.getByRole('button',{name:'Adicionar partida'}).waitFor(),{profile:fixture.name,trial,mode:'diagnostic'}));
    }finally{save(`diagnostic-save-action-${fixture.name}`,rows);await s.context.close();await restoreSyntheticWrite();}
  }
  save(`diagnostic-save-action-${fixture.name}`,rows);
}finally{await browser.close();}
