import {launch,session,login} from './browser.mjs';
import {capture,save} from './journeys.mjs';
import {base,request,fields} from './seed.mjs';
import {readFileSync,existsSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync('.test-tools/performance/fixtures.json'));
const browser=await launch();
const active=events=>{
  const origin=events.findLast(e=>e.kind==='document-start')?.origin;
  const relevant=events.filter(e=>e.origin===origin);
  return {firestore:relevant.filter(e=>e.kind==='listen-start').length-relevant.filter(e=>e.kind==='listen-stop').length,authModular:relevant.filter(e=>e.kind==='auth-start').length-relevant.filter(e=>e.kind==='auth-stop').length,callbacks:relevant.filter(e=>e.kind==='listen-callback').length};
};
const nav=(p,text)=>p.locator('nav').getByText(text,{exact:true});
const patch=(f,n)=>request(`${base}/users/${f.uid}/careers/c1?updateMask.fieldPaths=updatedAt`,{method:'PATCH',body:JSON.stringify({fields:fields({updatedAt:n})})});
try{
  for(const f of fixtures.filter(x=>!process.env.PERF_PROFILE||x.name===process.env.PERF_PROFILE)){
    const previousFile=`.test-tools/performance/raw/diagnostic-listeners-${f.name}.json`;
    if(existsSync(previousFile)&&JSON.parse(readFileSync(previousFile)).at(-1)?.name==='Group: abertura direta'){console.log('Preserved listeners',f.name);continue;}
    const s=await session(browser,true),p=s.page,rows=[];
    try{
      await login(s,f);await p.locator('[data-drop-id="c1"]').waitFor();await s.quiet();
      const initial=active(s.events);
      rows.push({...await capture(s,'updatedAt: antes dos ciclos',()=>patch(f,1700000000001),()=>p.waitForTimeout(100),{profile:f.name,mode:'diagnostic'}),listenersBefore:initial});
      for(let cycle=1;cycle<=3;cycle++){
        const before=active(s.events);
        const enter=await capture(s,'Listener: Careers → Group',()=>p.locator('[data-drop-id="g1"] h2').first().click(),()=>nav(p,'Elenco').waitFor(),{profile:f.name,cycle,mode:'diagnostic'});
        rows.push({...enter,listenersBefore:before,listenersAfter:active(s.events)});
        const leaveBefore=active(s.events);
        const leave=await capture(s,'Listener: Group → Careers',()=>p.getByRole('button',{name:'Voltar',exact:true}).click(),()=>p.locator('[data-drop-id="c1"]').waitFor(),{profile:f.name,cycle,mode:'diagnostic'});
        rows.push({...leave,listenersBefore:leaveBefore,listenersAfter:active(s.events)});
      }
      rows.push({...await capture(s,'updatedAt: depois dos ciclos',()=>patch(f,1700000000002),()=>p.waitForTimeout(100),{profile:f.name,mode:'diagnostic'}),listenersAfter:active(s.events)});
      await p.goto(s.origin+'/Career/c1/Season/s1');await nav(p,'Elenco').waitFor();await s.quiet();
      rows.push(await capture(s,'updatedAt: Season com abas ocultas',()=>patch(f,1700000000003),()=>p.waitForTimeout(100),{profile:f.name,mode:'diagnostic'}));
      await p.goto(s.origin+'/CareerGroup/g1/Geral');await nav(p,'Elenco').waitFor();await s.quiet();
      rows.push({name:'Group: abertura direta',profile:f.name,mode:'diagnostic',events:s.events.filter(e=>e.origin===s.events.findLast(x=>x.kind==='document-start').origin),requests:s.requests.filter(e=>e.t>=s.events.findLast(x=>x.kind==='document-start').origin),errors:s.errors});
      await patch(f,1700000000000);
      save(`diagnostic-listeners-${f.name}`,rows);
    }catch(error){rows.push({name:'Diagnóstico interrompido',profile:f.name,mode:'diagnostic',censored:true,reason:String(error),events:[],requests:[],errors:s.errors});console.log('DIAGNOSTIC LIMIT',f.name,String(error));}
    finally{save(`diagnostic-listeners-${f.name}`,rows);await s.context.close();await patch(f,1700000000000);}
  }
}finally{await browser.close();}
