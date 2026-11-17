import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lessons,parts} from '../public/lessons.js';
test('42 focused lessons in seven complete sections',()=>{
  assert.equal(lessons.length,42);assert.equal(parts.length,7);
  assert.equal(new Set(lessons.map(l=>l.id)).size,42);
  for(let n=0;n<7;n++) assert.equal(lessons.filter(l=>l.part===n).length,6);
  for(const l of lessons){
    for(const key of ['title','goal','story','predict','code','check','worked','change','question','setup','kind']) assert.ok(l[key]?.length>5,`${l.id}: ${key}`);
    assert.ok(l.code.split('\n').length<=22,`${l.id}: experiment should stay small`);
    assert.equal(l.choices.length,3);assert.ok(l.answer>=0&&l.answer<3);
    assert.match(l.check,/assert /);
    assert.ok(!/TODO|coming soon|placeholder/i.test(JSON.stringify(l)));
    assert.match(l.setup,/^reset\(/);
  }
});
test('GitHub Pages assets use relative paths',async()=>{
  const html=await readFile('public/index.html','utf8');
  assert.ok(!/(?:src|href)="\//.test(html));
  assert.match(html,/lang="en"/);
  const worker=await readFile('public/worker.js','utf8');
  assert.match(worker,/new URL\('_iceberg\/pyodide\/',base\)/);
  assert.ok(!worker.includes('https://'));
});
test('Models identify their boundary',()=>{
  const models=lessons.filter(l=>l.kind!=='Real Iceberg');
  assert.ok(models.length>=8);
  for(const l of models)assert.match(l.code+l.worked,/model|illustrative|scenario/i,l.id);
});
