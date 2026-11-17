import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {recaps,slide} from '../public/recaps.js';
const work=resolve('test-results/media');await mkdir(work,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 for(const [id,recap] of Object.entries(recaps)){
  for(let i=0;i<recap.scenes.length;i++){
   const path=`${work}/${id}-${i}.html`;await writeFile(path,slide(id,i));await page.goto(pathToFileURL(path).href);
   const bounds=await page.locator('.scene-note').boundingBox();
   if(bounds.y+bounds.height>620)throw Error(`Caption-safe content bounds exceeded: ${id} ${i}`);
   await page.screenshot({path:`${work}/${id}-${i}.png`});
  }
 }
 await writeFile(`${work}/inputs.json`,JSON.stringify(recaps,null,2));
}finally{await browser.close();}
console.log('Captured caption-safe slides for three concept recaps.');
