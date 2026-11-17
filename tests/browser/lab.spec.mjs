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
