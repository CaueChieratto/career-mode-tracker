import {launch,session,login} from './browser.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const browser=await launch();
try {
  const s=await session(browser,process.argv.includes('--profile'));const fixtures=JSON.parse(readFileSync('.test-tools/performance/fixtures.json'));
  try {await login(s,fixtures[0]);} catch(e) {await s.flush();console.log(await s.page.locator("body").innerText());console.log(s.errors);writeFileSync(".test-tools/performance/pilot-error.json",JSON.stringify({events:s.events,requests:s.requests,errors:s.errors}));throw e;}
  const snapshot=async name=>{await s.flush();writeFileSync(`.test-tools/performance/pilot-${name}.json`,JSON.stringify({text:await s.page.locator('body').innerText(),html:await s.page.locator('#root').innerHTML(),events:s.events,errors:s.errors},null,2));console.log(name,s.page.url(),(await s.page.locator('body').innerText()).slice(0,2000));};
  await snapshot('careers');
  await s.page.locator('[data-drop-id="c1"]').getByRole('button',{name:'Entrar',exact:true}).click();await s.quiet();await snapshot('career');
  await s.page.getByText('Temporada 1',{exact:true}).click();await snapshot('modal');
  await s.page.getByRole('button',{name:'Entrar na Temporada'}).click();await s.quiet();await snapshot('season');
  await s.page.screenshot({path:'.test-tools/performance/pilot-season.png',fullPage:true});
} finally {await browser.close();}
