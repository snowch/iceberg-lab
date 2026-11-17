import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadPyodide} from 'pyodide';
import {lessons} from '../public/lessons.js';
const runtime=resolve('public/_iceberg');
const lock=JSON.parse(await readFile(runtime+'/wheels/pyodide-lock.json','utf8'));
const py=await loadPyodide({indexURL:runtime+'/pyodide/',packageBaseUrl:runtime+'/wheels/',lockFileURL:runtime+'/wheels/pyodide-lock.json'});
await py.loadPackage(Object.keys(lock.packages),{messageCallback:()=>{}});
for(const file of ['shims.py','lab.py'])py.FS.writeFile('/'+file,await readFile('public/python/'+file));
py.runPython('import sys; sys.path.insert(0,"/"); import lab');
const run=py.runPython('lab.run');
let failed=0;
for(const l of lessons){
  try{
    const result=JSON.parse(run(l.setup,l.code,l.check));
    assert.equal(result.passed,true,result.feedback+'\n'+result.output);
    assert.ok(result.output.length>0);
    assert.ok(result.evidence.metadata.endsWith('.metadata.json'));
    console.log('PASS',l.id);
  }catch(error){failed++;console.error('FAIL',l.id,String(error));}
}
if(failed)throw new Error(`${failed} WASM lesson(s) failed`);
// Repeat in a different order: no dependency on preceding lesson variables or schema.
for(const id of ['readd','catalog','partition-evolution','bounds','stale-commit','time-travel']){
  const l=lessons.find(l=>l.id===id);
  assert.equal(JSON.parse(run(l.setup,l.code,l.check)).passed,true,'Independent rerun: '+id);
}
const l=lessons.find(l=>l.id==='bounds');
const modified=l.code.replaceAll('order_id = 1005','order_id = 999999');
assert.equal(JSON.parse(run(l.setup,modified,l.check)).passed,false,'A meaningful check must detect a changed result');
assert.throws(()=>run('reset()','raise ValueError("intentional")','assert True'));
assert.throws(()=>run('reset()','leaked = 123\nraise ValueError("intentional")','assert True'));
assert.equal(JSON.parse(run('reset()',"assert 'leaked' not in globals()\nshow('clean')",'assert True')).passed,true);
assert.equal(JSON.parse(run(l.setup,l.code,l.check)).passed,true,'Recover after learner code error');
const paths=JSON.parse(py.runPython('lab.json.dumps(lab.warehouse())'));
for(const suffix of ['.metadata.json','.avro','.parquet','.db']){
  const file=paths.find(p=>p.path.endsWith(suffix));assert.ok(file);
  py.globals.set('_test_path',file.path);
  const decoded=JSON.parse(py.runPython('lab.json.dumps(lab.inspect_path(_test_path), default=str)'));
  assert.ok(decoded);
}
assert.throws(()=>py.runPython('lab.inspect_path("../lab.py")'));
py.runPython('assert len(lab.export_zip()) > 1000');
console.log('PASS independent reruns, changed-code check, error recovery, inspector, path guard and ZIP export');
