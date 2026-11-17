import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('real WASM experiment, meaningful check, inspection, export and recovery',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('./');
  await expect(page.getByRole('heading',{level:1})).toContainText('Understand the table');
  await expect.poll(()=>page.locator('.brand img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  expect(requests.some(url=>url.includes('.wasm'))).toBe(false);
  await page.goto('./#lesson/bounds');
  await page.getByRole('button',{name:'Run experiment'}).click();
  await expect(page.locator('.feedback')).toContainText('Evidence check passed',{timeout:120000});
  await expect(page.locator('.output pre')).toContainText('"candidate_records": 40');
  await page.getByText('Inspect warehouse ·',{exact:false}).click();
  await page.locator('[data-file]').filter({hasText:'.metadata.json'}).last().click();
  await expect(page.locator('#inspector')).toContainText('current-snapshot-id');
  const zipDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export warehouse'}).click();
  const zip=await zipDownload;
  const bytes=await readFile(await zip.path());
  expect(bytes.subarray(0,2).toString()).toBe('PK');
  const evidenceDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export evidence'}).click();
  const evidence=JSON.parse(await readFile(await (await evidenceDownload).path(),'utf8'));
  expect(evidence.lesson).toBe('bounds');expect(evidence.passed).toBe(true);
  await page.getByLabel('A file can be ruled out when its range cannot match').check();
  await page.getByRole('button',{name:'Check explanation'}).click();
  await expect(page.locator('#review')).toContainText('Reviewed');
  await page.locator('#code').fill('show(123)');
  await page.getByRole('button',{name:'Run experiment'}).click();
  await expect(page.locator('.feedback')).toContainText('Check not met');
  await page.locator('#code').fill('raise ValueError("learner experiment")');
  await page.getByRole('button',{name:'Run experiment'}).click();
  await expect(page.locator('.output.error')).toContainText('learner experiment');
  await page.getByRole('button',{name:'Reset code'}).click();
  await page.getByRole('button',{name:'Run experiment'}).click();
  await expect(page.locator('.feedback')).toContainText('Evidence check passed');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'test-results/desktop-lesson.png',fullPage:true});
  await page.reload();
  await expect(page.locator('#review')).toContainText('Reviewed');
  expect(errors).toEqual([]);
  expect(requests.filter(url=>!url.startsWith('http://127.0.0.1:4173/'))).toEqual([]);
});

test('mobile navigation, theme and focused lesson search',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.screenshot({path:'test-results/mobile-overview.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Toggle lesson navigation'}).click();
  await page.getByRole('searchbox',{name:'Find a lesson'}).fill('bounds');
  await expect(page.locator('#lesson-nav a')).toHaveCount(2);
  await page.locator('#lesson-nav a').filter({hasText:'Skip files with bounds'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Skip files with bounds');
  await expect(page.getByRole('button',{name:'Toggle lesson navigation'})).toHaveAttribute('aria-expanded','false');
  await page.getByRole('button',{name:'Switch color theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-lesson.png',fullPage:true});
});

test('all lesson deep links render and the reading path works without WASM',async({page})=>{
  const {lessons}=await import('../../public/lessons.js');
  await page.goto('./');
  for(const l of lessons){
    await page.goto('./#lesson/'+l.id);
    await expect(page.getByRole('heading',{level:1})).toHaveText(l.title);
    await expect(page.locator('#code')).toHaveValue(l.code);
  }
  await page.locator('#code').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Run experiment'})).toBeFocused();
  await page.getByRole('link',{name:'Skip to lesson'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();
  await expect(page.getByRole('heading',{level:1})).toHaveText(lessons.at(-1).title);
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
  await expect(page.locator('#progress-text')).toHaveText('1 of 42 reviewed');
  await page.goto('./#guide');
  await expect(page.getByRole('heading',{name:'Runtime boundaries'})).toBeVisible();
});

test('learning notes, progressive hints, actionable feedback and section transfer',async({page})=>{
  await page.goto('./#lesson/bounds');
  await expect(page.locator('.concept')).toContainText('exclusion evidence');
  await page.getByLabel('Your prediction and why').fill('One file, because the batch ID ranges are disjoint.');
  await page.getByLabel('Explain it in your own words').fill('A kept file is only a candidate.');
  await page.getByText('Need a starting point?',{exact:true}).click();
  await expect(page.locator('.learning-hint')).toContainText('1005');
  await expect(page.locator('.learning-hint details')).not.toHaveAttribute('open','');
  await page.getByText('What evidence should I look for?',{exact:true}).click();
  await expect(page.locator('.learning-hint details')).toHaveAttribute('open','');
  await page.getByLabel('Every value inside the range exists').check();
  await page.getByRole('button',{name:'Check explanation'}).click();
  await expect(page.locator('#quiz-feedback')).toContainText('Separate selected files');
  await page.reload();
  await expect(page.locator('#prediction-note')).toHaveValue('One file, because the batch ID ranges are disjoint.');
  await expect(page.locator('#reflection-note')).toHaveValue('A kept file is only a candidate.');
  await page.goto('./#lesson/catalog');
  await expect(page.locator('#prediction-note')).toHaveValue('');
  await page.goto('./#lesson/hidden-transforms');
  await expect(page.locator('.transfer')).toContainText('old queries remain expensive');
  await page.getByText('Review your explanation',{exact:true}).click();
  await expect(page.locator('.transfer li')).toHaveCount(3);
  await page.getByRole('link',{name:'03 Explain',exact:true}).click();
  await expect(page.locator('#worked')).toHaveAttribute('open','');
  await expect(page).toHaveURL(/#lesson\/hidden-transforms$/);
});

test('concept diagrams, references and prerequisites remain readable across lessons and themes',async({page})=>{
 const {lessons}=await import('../../public/lessons.js');
 await page.goto('./');
 await expect(page.getByRole('region',{name:'Course prerequisites'})).toContainText('No prior Iceberg');
 for(const width of [390,820,1440]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   for(const l of lessons){
    await page.goto('./#lesson/'+l.id);
    await expect(page.locator('.concept-diagram')).toHaveCount(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),l.id+' '+width+' '+theme).toBe(true);
   }
  }
 }
 await page.goto('./#lesson/catalog');
 await expect(page.locator('.first-lesson-readiness')).toContainText('Iceberg knowledge is not assumed');
 await page.locator('.references>summary').click();
 await expect(page.locator('.references')).toContainText('Which information exists');
 await expect(page.locator('.references a').first()).toHaveAttribute('href','https://iceberg.apache.org/spec/#table-metadata');
 await page.getByText('Compare your explanation',{exact:true}).click();
 await expect(page.locator('.reference-answer')).toHaveAttribute('open','');
});

test('optional recaps play, seek and expose captions, transcripts and recovery',async({page})=>{
 const requests=[];page.on('request',r=>requests.push(r.url()));
 for(const id of ['snapshots','bounds','atomic-pointer']){
  await page.goto('./#lesson/'+id);
  const before=requests.filter(url=>/\.(mp4|webm)$/.test(url)).length;
  await expect(page.locator('video')).toHaveAttribute('preload','none');
  expect(requests.filter(url=>/\.(mp4|webm)$/.test(url)).length).toBe(before);
  await page.locator('.recap>summary').click();
  await page.locator('video').evaluate(video=>{video.muted=true;return Promise.race([video.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Playback did not start')),10000))]);});
  await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime),{timeout:15000}).toBeGreaterThan(0.2);
  await page.locator('.recap>summary').click();
  await expect.poll(()=>page.locator('video').evaluate(video=>video.paused)).toBe(true);
  await page.locator('.recap>summary').click();
  const duration=await page.locator('video').evaluate(video=>video.duration);expect(duration).toBeGreaterThan(30);
  await page.locator('video').evaluate(video=>{video.pause();video.currentTime=video.duration-2;});
  await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(duration-3);
  await page.getByText('Read the transcript',{exact:true}).click();
  await expect(page.locator('.transcript h3')).toHaveCount(3);
  const track=page.locator('track');await expect(track).toHaveAttribute('kind','captions');
  expect(await track.evaluate(el=>el.track.cues?.length||0)).toBeGreaterThan(5);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.route('**/recap.*',route=>route.abort());
 await page.goto('./#lesson/bounds');await page.locator('.recap>summary').click();
 await page.locator('video').evaluate(video=>{video.muted=true;video.play().catch(()=>{});});
 await expect(page.locator('.media-recovery')).toContainText('use the transcript');
 await page.getByText('Read the transcript',{exact:true}).click();
 await expect(page.locator('.transcript p').first()).toContainText('one order');
});

test('course menu preserves a wide workspace and closes predictably',async({page})=>{
 await page.goto('./#lesson/bounds');
 await expect(page.locator('#sidebar')).not.toBeVisible();
 const prose=await page.locator('.story').boundingBox();const workspace=await page.locator('.experiment').boundingBox();
 expect(workspace.width).toBeGreaterThan(prose.width+200);
 await page.getByRole('button',{name:'Toggle lesson navigation'}).click();
 await expect(page.locator('#sidebar [aria-current=page]')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('#sidebar')).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Toggle lesson navigation'})).toBeFocused();
 await page.getByRole('button',{name:'Toggle lesson navigation'}).click();
 await page.getByRole('button',{name:'Close course navigation'}).click();
 await expect(page.locator('#sidebar')).not.toBeVisible();
 await page.getByRole('button',{name:'Toggle lesson navigation'}).click();
 await page.getByRole('heading',{level:1}).click();
 await expect(page.locator('#sidebar')).not.toBeVisible();
 await page.setViewportSize({width:820,height:1000});
 const tablet=await page.locator('.experiment').boundingBox();expect(tablet.width).toBeGreaterThan(700);
 await page.getByRole('button',{name:'Toggle lesson navigation'}).click();
 await page.screenshot({path:'test-results/tablet-course-menu.png'});
});
