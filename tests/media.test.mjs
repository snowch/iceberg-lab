import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {lessons} from '../public/lessons.js';
import {visuals,diagram,references} from '../public/visuals.js';
import {recaps} from '../public/recaps.js';
import {media} from '../public/media-manifest.js';
test('every lesson has a scoped diagram and a source-guided reading task',()=>{
 assert.equal(Object.keys(visuals).length,lessons.length);
 for(const l of lessons){
  const v=visuals[l.id];assert.ok(v.title&&v.note&&v.question&&v.anchor,l.id);
  assert.ok(v.rows.length>=1&&v.rows.every(([,nodes])=>nodes.length>=1),l.id);
  assert.match(diagram(l.id),/not a live experiment result/);
  assert.match(references(l),new RegExp('https://iceberg.apache.org/spec/#'+v.anchor));
  assert.match(references(l),/Compare your explanation/);
  assert.match(references(l),/format-v2 fixtures/);
 }
});
test('recaps have real fast-start MP4s, caption-aligned transcripts and bounded timelines',async()=>{
 assert.equal(Object.keys(recaps).length,3);assert.equal(Object.keys(media).length,3);
 for(const [id,recap] of Object.entries(recaps)){
  const info=media[id];assert.ok(info.durationSeconds>30&&info.durationSeconds<90);
  const path='public/media/'+id+'/';
  assert.equal((await stat(path+'recap.mp4')).size,info.bytes);
  assert.equal((await stat(path+'recap.webm')).size,info.webmBytes);
  const file=await readFile(path+'recap.mp4');assert.equal(file.toString('ascii',4,8),'ftyp');
  assert.ok(file.indexOf('moov')<file.indexOf('mdat'),'fast start: '+id);
  assert.ok((await stat(path+'poster.jpg')).size>1000);
  const vtt=await readFile(path+'captions.vtt','utf8');assert.ok(vtt.startsWith('WEBVTT\n'));
  const cues=[...vtt.matchAll(/(\d\d):(\d\d):(\d\d\.\d{3}) --> (\d\d):(\d\d):(\d\d\.\d{3})\n([^\n]+)/g)];
  assert.ok(cues.length>=6);
  let previous=0;
  for(const c of cues){const start=Number(c[1])*3600+Number(c[2])*60+Number(c[3]);const end=Number(c[4])*3600+Number(c[5])*60+Number(c[6]);assert.ok(start>=previous&&end>start&&end<=info.durationSeconds);previous=end;}
  assert.equal(cues.map(c=>c[7]).join(' '),recap.scenes.map(s=>s.text).join(' '));
  assert.equal(info.scenes.length,3);assert.equal(info.scenes[0].start,0);
 }
});
