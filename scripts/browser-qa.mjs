import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import chromiumBinary from '@sparticuz/chromium';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3100','--hostname','127.0.0.1'],{stdio:'inherit'});
let browser;const results=[];
try{await new Promise(r=>setTimeout(r,1500));console.log('launching chromium');
browser=await chromium.launch({executablePath:await chromiumBinary.executablePath(),args:chromiumBinary.args.filter(a=>a!=='--single-process' && a!=='--disable-web-security'),headless:true});
for(const [name,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]]){const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));for(const route of ['/','/sample-desk','/checkout','/trust','/legal','/desk']){await page.goto('http://localhost:3100'+route);await page.waitForTimeout(150);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);const axe=await new AxeBuilder({page}).analyze();const violations=axe.violations.filter(v=>['critical','serious'].includes(v.impact));results.push({name,route,overflow,violations:violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),errors:[...errors]});await page.screenshot({path:`qa/${name}-${route.replaceAll('/','')||'home'}.png`,fullPage:true});}await page.goto('http://localhost:3100/qualify');results.push({name,redirect:page.url().endsWith('/checkout')});await context.close();}
for(const route of ['/api/desk','/api/export']){const r=await fetch('http://localhost:3100'+route);results.push({route,unauthorized:r.status===401});}
const a=await fetch('http://localhost:3100/api/activation?success=true',{method:'POST',headers:{origin:'http://localhost:3100'}});results.push({forgedSuccessDoesNotActivate:!(await a.text()).includes('"ACTIVE"')});
await writeFile('qa/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>r.overflow||r.violations?.length||r.errors?.length||r.redirect===false||r.unauthorized===false||r.forgedSuccessDoesNotActivate===false))process.exitCode=1;
}finally{await browser?.close();server.kill();}
