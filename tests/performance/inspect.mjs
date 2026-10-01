import {launch,session} from './browser.mjs';
const browser=await launch();
try{const s=await session(browser);await s.page.goto(s.origin);await s.page.waitForTimeout(1500);await s.flush();console.log(JSON.stringify({html:await s.page.locator('body').innerHTML(),errors:s.errors,requests:s.requests,events:s.events.slice(0,15)},null,2));}finally{await browser.close();}
