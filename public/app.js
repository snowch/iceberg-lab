import {parts,lessons} from './lessons.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(key,fallback){try{return JSON.parse(localStorage.getItem('iceberg-v1:'+key)) ?? fallback;}catch{return fallback;}},
  set(key,value){try{localStorage.setItem('iceberg-v1:'+key,JSON.stringify(value));}catch{/* Storage can be disabled; learning still works. */}}
};
let reviewed = store.get('reviewed',[]).filter(id=>lessons.some(l=>l.id===id));
let worker, ready=false, busy=false, pending=null, current=null, activeRun=null, warehouseOwner=null;
let runtimeText='Runtime starts only when you run an experiment.';
const results = new Map();
const quizAnswers = new Map();
const passRuns = new Set();
document.querySelector('.skip').onclick=event=>{event.preventDefault();$('content').focus({preventScroll:true});window.scrollTo(0,0);};
document.documentElement.dataset.theme=store.get('theme','light');
$('theme').onclick=()=>{
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=theme;store.set('theme',theme);
};
$('menu').onclick=()=>{
  const open=$('sidebar').classList.toggle('open');$('menu').setAttribute('aria-expanded',String(open));
  syncSidebar();
};
const mobile=matchMedia('(max-width:760px)');
function syncSidebar(){$('sidebar').inert=mobile.matches&&!$('sidebar').classList.contains('open');}
mobile.addEventListener('change',syncSidebar);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mobile.matches&&$('sidebar').classList.contains('open')){
    $('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');syncSidebar();$('menu').focus();
  }
});
$('search').oninput=renderNav;
$('clear-progress').onclick=()=>{reviewed=[];store.set('reviewed',reviewed);renderNav();if(current)updateReview();};
function renderNav(){
  const query=$('search').value.trim().toLowerCase();
  let count=0;
  $('lesson-nav').innerHTML=parts.map(([number,title],part)=>{
    const found=lessons.filter(l=>l.part===part && (l.title+' '+l.goal+' '+title).toLowerCase().includes(query));
    count+=found.length;
    if(!found.length)return '';
    return `<section class="nav-part"><h2><span>${number}</span>${title}</h2>${found.map(l=>{
      const idx=lessons.indexOf(l);
      return `<a href="#lesson/${l.id}" ${current?.id===l.id?'aria-current="page"':''}><span class="nav-number">${String(idx+1).padStart(2,'0')}</span><span>${l.title}</span>${reviewed.includes(l.id)?'<span class="nav-done" aria-label="Reviewed">✓</span>':''}</a>`;
    }).join('')}</section>`;
  }).join('');
  $('no-results').hidden=count>0;
  $('progress-text').textContent=`${reviewed.length} of ${lessons.length} reviewed`;
  $('progress').value=reviewed.length;
}
function home(){
  const last=store.get('last',null);
  const resume=lessons.find(l=>l.id===last);
  $('content').innerHTML=`
    <section class="hero"><div class="eyebrow">The browser field guide <span> / Apache Iceberg</span></div>
    <h1>Understand the table.<br><em>See what changes.</em></h1>
    <p class="lead">Follow the files. Read less data. Change a table safely. Learn Iceberg through small experiments with real tables, running entirely in your browser.</p>
    <div class="actions"><a class="button primary" href="#lesson/${resume?.id||'catalog'}">${resume?'Continue learning':'Start the first lesson'} <span>→</span></a><a class="button" href="#guide">Explore your laboratory</a></div>
    <div class="facts"><span><i class="dot"></i>42 focused lessons</span><span><i class="dot"></i>About 5 minutes each</span><span><i class="dot"></i>No setup or account</span><span><i class="dot"></i>Local WASM execution</span></div>
    <div class="metadata-map" role="img" aria-label="A catalog points to table metadata, then to a manifest list, then manifests, then data files."><div class="map-label">One table. A chain of evidence.</div><div class="map-flow">
    <div class="map-node">Catalog<small>Find the table</small></div><span class="map-arrow">→</span>
    <div class="map-node">Metadata<small>Choose a state</small></div><span class="map-arrow">→</span>
    <div class="map-node">Manifest list<small>Find manifests</small></div><span class="map-arrow">→</span>
    <div class="map-node">Manifests<small>Select files</small></div><span class="map-arrow">→</span>
    <div class="map-node">Data files<small>Read the rows</small></div></div></div></section>
    <div class="section-intro"><h2>From a file to a governed table</h2><p>Seven sections. One idea per lesson.</p></div>
    <div class="course-grid">${parts.map(([number,title,desc],part)=>`<section class="part-card"><span class="part-number">PART ${number} / 6 LESSONS</span><h3>${title}</h3><p>${desc}</p><div class="card-lessons">${lessons.filter(l=>l.part===part).map(l=>`<a href="#lesson/${l.id}"><span>${String(lessons.indexOf(l)+1).padStart(2,'0')}</span>${l.title} →</a>`).join('')}</div></section>`).join('')}</div>
    <div class="reading-note"><p><strong>Learn by investigating.</strong> Make a prediction, run the experiment, inspect the evidence, then change one thing. Every lesson has a worked explanation, so you can read first and run when ready.</p></div>
    <p class="story">Know basic SQL and a little Python. The <a href="https://snowch.github.io/parquet-book/">Parquet lab</a> explains the file beneath the table; the <a href="https://snowch.github.io/query-engine-book/">Query Engine lab</a> follows the work above it. You can start here without completing either.</p>`;
}
function guide(){
  $('content').innerHTML=`<article class="guide"><div class="eyebrow">Reference / Your laboratory</div><h1>A real table.<br>Inside your tab.</h1>
  <p class="lead">The page downloads a Python WASM runtime on your first experiment. PyIceberg creates the table, Arrow writes the files, and DuckDB runs SQL locally.</p>
  <section><h2>How a lesson works</h2><p>Each lesson asks one question. Predict the outcome, run the editable Python, inspect its output and the warehouse, then compare it with the worked result. Try the suggested variation and answer the explanation check.</p><p>Every run recreates that lesson’s fixture. It does not continue the previous run or previous lesson. Your code edits and review progress are saved in this browser when storage is available. The warehouse itself is held in worker memory and is lost on reload, stopping the runtime, or starting another experiment.</p><p>Use <strong>Mark reviewed</strong> to track a reading path. It is a personal bookmark, not a certificate. Passing the original code check and the explanation question also marks the lesson reviewed. Variations may deliberately fail the original check; inspect the result and explain why.</p></section>
  <section><h2>What actually runs</h2><table><thead><tr><th>Layer</th><th>Pinned implementation</th></tr></thead><tbody>
  <tr><td>Interpreter</td><td>Pyodide 314.0.3, in a Web Worker</td></tr><tr><td>Table library</td><td>PyIceberg 0.11.1 · format v2 fixtures</td></tr><tr><td>Catalog</td><td>PyIceberg SqlCatalog on local SQLite</td></tr><tr><td>Files</td><td>Real metadata JSON, Avro manifests and Parquet</td></tr><tr><td>Data / SQL</td><td>PyArrow 22.0.0 / DuckDB 1.5.1</td></tr><tr><td>Data</td><td>120 synthetic orders in the default fixture; no personal data</td></tr></tbody></table>
  <p>Self-hosted runtime assets cost roughly 46 MB uncompressed on first load. Browser caching and compression affect actual transfer. Startup may take tens of seconds. Nothing is downloaded for computation until you select Run. Static lesson assets load normally.</p>
  <p>There are no cloud credentials, remote catalog services, query servers or analytics trackers. After runtime assets load, experiments require no network services. This is not an offline-installed application; navigation after a full offline reload depends on the browser cache.</p></section>
  <section><h2>Read the evidence correctly</h2><ul><li><strong>Real Iceberg</strong> means the operation uses PyIceberg and real table files.</li><li><strong>Model</strong> labels mean an explicit teaching calculation or policy scenario. These do not demonstrate distributed services or production enforcement.</li><li><strong>Candidate records</strong> are rows in selected files, not necessarily rows examined by every downstream operator.</li><li><strong>Selected file bytes</strong> sum file sizes; they are not measured bytes read, HTTP traffic or billing.</li><li><strong>Elapsed time</strong> includes fixture setup, the example and its check in the worker. It is not an isolated query benchmark.</li></ul>
  <p>The SQL helper first materializes an Iceberg scan as Arrow and then registers it with DuckDB. SQL WHERE clauses do not feed predicates back into the Iceberg scan. Use <code>table.scan(row_filter=...)</code> or <code>metrics(predicate)</code> when investigating Iceberg pruning.</p></section>
  <section><h2>Runtime boundaries</h2><p>This pinned build supports real identity partition writes, schema changes, snapshot reads, tags, copy-on-write deletes and metadata-only snapshot expiration. Day and bucket partition writes need a native helper absent from this WASM build. Merge-on-read delete files and distributed compaction are not implemented here.</p><p>Small-table consolidation uses a full overwrite. Snapshot expiration removes references but does not physically delete files in this implementation. Concurrent commits use a sequential interleaving against the real SQLite catalog. This cannot measure distributed catalog behavior, conflict timing or cluster throughput.</p><p>Two compatibility shims adapt upstream Python scheduling to a synchronous executor and reject unavailable S3 filesystem use. They do not implement or synthesize Iceberg metadata.</p><p>Governance exercises expose intended access paths and failure modes. Code running under the learner’s control cannot provide trusted authorization, tamper-resistant audit or proof of regulatory compliance.</p></section>
  <section><h2>Vocabulary to keep nearby</h2><table><thead><tr><th>Term</th><th>Meaning in this lab</th></tr></thead><tbody>
  <tr><td>Catalog</td><td>Resolves a table name and coordinates publication of its current metadata.</td></tr>
  <tr><td>Snapshot</td><td>A table state identified by an ID, with references to its manifest list.</td></tr>
  <tr><td>Manifest list</td><td>An Avro file listing manifests and summaries for one snapshot.</td></tr>
  <tr><td>Manifest</td><td>An Avro file containing data-file or delete-file entries and their metrics.</td></tr>
  <tr><td>Field ID</td><td>A stable identity for a column, independent of its current name or position.</td></tr>
  <tr><td>Partition specification</td><td>Source fields and transforms used to partition files. Old files retain the spec that wrote them.</td></tr>
  <tr><td>Pruning</td><td>Ruling out files or other units that cannot contain matching data.</td></tr>
  <tr><td>Residual predicate</td><td>The condition still needing evaluation after coarse metadata decisions.</td></tr>
  <tr><td>Copy-on-write</td><td>Replacing affected data files to apply row changes.</td></tr>
  <tr><td>Merge-on-read</td><td>Combining data with supported row-delete information during reads.</td></tr>
  <tr><td>Compaction</td><td>Rewriting data into a more useful physical layout while preserving its logical contents.</td></tr>
  <tr><td>Expiration</td><td>Removing eligible snapshot history from current table metadata; physical cleanup is a separate concern here.</td></tr>
  <tr><td>Orphan file</td><td>A file no longer referenced by the relevant table state and retention graph. Age and in-flight writes matter before removal.</td></tr>
  <tr><td>Optimistic concurrency</td><td>Preparing a change, then validating its requirements against current state at commit time.</td></tr>
  </tbody></table></section>
  <section><h2>Inspect and export</h2><p>After a run, open the warehouse list to inspect actual JSON, Avro or Parquet metadata. Export warehouse downloads a ZIP containing the catalog and files, including retained historical data. It exports the most recent experiment in this worker. It does not persist that warehouse into the next lesson.</p><p>Metadata contains absolute <code>file:///warehouse/...</code> paths. To reopen an export, extract at <code>/warehouse</code> in an isolated environment and use a compatible PyIceberg SqlCatalog with <code>sqlite:////warehouse/catalog.db</code>. Moving it elsewhere requires a deliberate path relocation; an arbitrary unzip location is not portable. The exported SQLite catalog is an instructional local catalog, not a REST catalog.</p><p>Export evidence separately to save your code, fixture, check result and table state. No cloud upload is performed.</p></section>
  <section><h2>If something fails</h2><p>Use Stop / restart to terminate an experiment that is taking too long, then run again. This discards its in-memory warehouse. Reset code restores the original example. If the runtime cannot load, check access to this site’s static assets and available browser memory. Read the worked explanation while it loads; try a current desktop Chrome, Firefox or Safari.</p></section>
  <section><h2>Sources and further reading</h2><ul><li><a href="https://iceberg.apache.org/spec/">Apache Iceberg table specification</a></li><li><a href="https://py.iceberg.apache.org/">PyIceberg documentation</a></li><li><a href="https://pyodide.org/en/314.0.3/">Pyodide runtime documentation</a></li><li><a href="https://github.com/iancmoritz/apacheprojects/tree/main/iceberg">Apache projects in the browser: Iceberg runtime investigation</a> — source of the adapted compatibility shims and runtime packaging script.</li><li><a href="https://snowch.github.io/labs/">Chris Snow’s labs</a> — focused investigations, worked explanations and evidence-led learning.</li></ul></section>
  <div class="actions"><a class="button primary" href="#lesson/catalog">Start investigating →</a><a class="button" href="#">Course overview</a></div></article>`;
}
function renderLesson(l){
  store.set('last',l.id);
  const idx=lessons.indexOf(l),prev=lessons[idx-1],next=lessons[idx+1];
  const saved=store.get('draft:'+l.id,l.code);
  const choices=l.choices.map((text,i)=>({text,index:i}));
  // Rotate positions so the explanation check never teaches a fixed answer position.
  for(let n=0;n<idx%choices.length;n++)choices.push(choices.shift());
  $('content').innerHTML=`<article class="lesson"><div class="eyebrow">Part ${parts[l.part][0]} / ${parts[l.part][1]}</div>
  <h1>${l.title}</h1><div class="lesson-meta"><span>LESSON ${String(idx+1).padStart(2,'0')} / 42</span><span>≈ ${l.minutes} MIN</span><span class="badge ${l.kind==='Real Iceberg'?'':'model'}">${l.kind}</span></div>
  <p class="goal">${escape(l.goal)}</p><p class="story">${escape(l.story)}</p>
  <div class="predict"><span class="step-label">01 / Predict</span><p>${escape(l.predict)}</p></div>
  <section class="experiment" aria-label="Editable experiment"><div class="experiment-head"><h2>Run the investigation</h2><span>02 / Execute & inspect</span></div>
  <div id="runtime-status" class="runtime-status" role="status"><i class="dot"></i><span></span></div>
  <div class="editor-shell"><div class="editor-bar"><span>experiment.py · editable Python</span><button id="reset-code">Reset code</button></div><label class="sr-only" for="code">Experiment code</label><textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Editable Python experiment">${escape(saved)}</textarea></div>
  <div class="run-bar"><button id="run" class="button primary">Run experiment <span>→</span></button><button id="stop" class="button subtle" ${worker?'':'hidden'}>Stop / restart</button><button id="export" class="button" disabled>Export warehouse ↓</button><span class="hint">Fresh fixture on every run · Ctrl / ⌘ + Enter</span></div>
  <details class="setup"><summary>Fixture setup & evidence check</summary><p>Executed before your code; each run starts independently.</p><pre>${escape(l.setup)}</pre><p>The evidence check below runs after your code. Variations can legitimately change these expected results.</p><pre>${escape(l.check)}</pre><p><a href="./python/lab.py">Read the fixture helpers</a> · <a href="#guide">Runtime & limits</a></p></details>
  <div id="result" aria-live="polite"></div></section>
  <details class="worked"><summary>03 / Compare with the worked result</summary><p>${escape(l.worked)}</p></details>
  <section class="change-box"><div class="eyebrow">04 / Change one thing</div><h2>Test your explanation</h2><p>${escape(l.change)}</p></section>
  <form class="quiz" id="quiz"><h2>Explain what happened</h2><p class="question">${escape(l.question)}</p>${choices.map(c=>`<label><input type="radio" name="answer" value="${c.index}" required><span>${escape(c.text)}</span></label>`).join('')}<button class="button" type="submit">Check explanation →</button><p class="quiz-feedback" id="quiz-feedback" role="status"></p></form>
  <div class="review-bar"><span id="review-text"></span><button id="review" class="button subtle"></button></div>
  <nav class="pagination" aria-label="Lesson navigation"><a href="${prev?'#lesson/'+prev.id:'#'}"><small>← ${prev?'Previous lesson':'Course overview'}</small>${prev?.title||'See the learning path'}</a><a href="${next?'#lesson/'+next.id:'#'}"><small>${next?'Next lesson':'Back to overview'} →</small>${next?.title||'Review your learning'}</a></nav></article>`;
  $('code').style.height=Math.min(600,Math.max(190,saved.split('\n').length*22+30))+'px';
  $('code').oninput=()=>store.set('draft:'+l.id,$('code').value);
  $('code').onkeydown=event=>{
    if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();runLesson(l);}
  };
  $('reset-code').onclick=()=>{$('code').value=l.code;store.set('draft:'+l.id,l.code);};
  $('run').onclick=()=>runLesson(l);
  $('stop').onclick=stopWorker;
  $('export').onclick=()=>{if(!busy&&warehouseOwner===l.id){setBusy(true);worker.postMessage({type:'export'});}};
  $('quiz').onsubmit=event=>{
    event.preventDefault();const picked=new FormData(event.currentTarget).get('answer');
    const ok=Number(picked)===l.answer;quizAnswers.set(l.id,ok);
    $('quiz-feedback').textContent=ok?'Correct. '+l.choices[l.answer]+'. Explain how your evidence supports this.':'Revisit the worked result, then try again. Look for the boundary or mechanism behind the observation.';
    if(ok&&passRuns.has(l.id))markReviewed(l.id);
  };
  $('review').onclick=()=>{
    if(reviewed.includes(l.id))reviewed=reviewed.filter(id=>id!==l.id);
    else reviewed.push(l.id);
    store.set('reviewed',reviewed);renderNav();updateReview();
  };
  updateRuntime();updateReview();
  if(results.has(l.id))renderResult(results.get(l.id));
}
function updateReview(){
  if(!$('review'))return;
  const done=reviewed.includes(current.id);
  $('review').textContent=done?'✓ Reviewed · undo':'Mark reviewed';
  $('review-text').textContent=done?'Saved in this browser.':'Track your reading even without running code.';
}
function markReviewed(id){
  if(!reviewed.includes(id)){reviewed.push(id);store.set('reviewed',reviewed);renderNav();updateReview();}
}
function updateRuntime(){
  if(!$('runtime-status'))return;
  $('runtime-status').classList.toggle('busy',busy);
  $('runtime-status').querySelector('span').textContent=runtimeText;
  $('run').disabled=busy;
  $('run').innerHTML=busy?'Working…':'Run experiment <span>→</span>';
  $('stop').hidden=!worker;
  $('export').disabled=busy||!ready||warehouseOwner!==current?.id;
  document.querySelectorAll('[data-file]').forEach(button=>button.disabled=busy||warehouseOwner!==current?.id);
}
function setBusy(value){busy=value;updateRuntime();}
function startWorker(){
  worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    if(data.type==='status'){runtimeText=data.text;updateRuntime();}
    if(data.type==='ready'){
      ready=true;
      if(pending){const request=pending;pending=null;worker.postMessage(request);runtimeText='Running fixture, experiment and evidence check…';updateRuntime();}
      else setBusy(false);
    }
    if(data.type==='result'){
      const id=activeRun.id;
      data.source=activeRun.code;data.setup=activeRun.setup;data.lesson=id;
      results.set(id,data);warehouseOwner=id;
      if(data.passed){passRuns.add(id);if(quizAnswers.get(id))markReviewed(id);}else passRuns.delete(id);
      runtimeText='Ready · experiment completed locally';setBusy(false);
      if(current?.id===id)renderResult(data);
    }
    if(data.type==='archive'){
      download(data.bytes,'iceberg-warehouse.zip','application/zip');setBusy(false);
    }
    if(data.type==='inspection'){
      if($('inspector'))$('inspector').textContent=JSON.stringify(data.value,null,2);
      setBusy(false);
    }
    if(data.type==='error'){
      runtimeText='Experiment could not complete. Edit the code or stop / restart.';
      pending=null;setBusy(false);
      if($('result'))$('result').innerHTML=`<div class="output error"><div class="output-title">Runtime error</div><pre>${escape(data.text)}</pre></div>`;
    }
  };
  worker.onerror=event=>{
    runtimeText='Runtime failed to load. Stop / restart to try again.';pending=null;setBusy(false);
    if($('result'))$('result').innerHTML=`<div class="output error"><div class="output-title">Worker error</div><pre>${escape(event.message||'Check browser access to the static runtime assets.')}</pre></div>`;
  };
  worker.postMessage({type:'boot'});
}
function stopWorker(){
  worker?.terminate();worker=null;ready=false;pending=null;activeRun=null;warehouseOwner=null;
  runtimeText='Runtime stopped. Run again to start a fresh worker.';setBusy(false);
  if($('inspector'))$('inspector').textContent='Runtime stopped; run this lesson again to inspect its files.';
}
function runLesson(l){
  if(busy)return;
  passRuns.delete(l.id);
  activeRun={type:'run',id:l.id,setup:l.setup,code:$('code').value,check:l.check};
  store.set('draft:'+l.id,activeRun.code);
  // Another run destroys the previous warehouse, even if the new code raises.
  warehouseOwner=null;setBusy(true);
  runtimeText=ready?'Running fixture, experiment and evidence check…':'Starting local runtime. First load may take tens of seconds…';
  updateRuntime();
  if(!worker){pending=activeRun;startWorker();}
  else if(!ready){pending=activeRun;worker.postMessage({type:'boot'});}
  else worker.postMessage(activeRun);
}
function download(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type}));const link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderResult(result){
  const e=result.evidence;
  $('result').innerHTML=`<div class="output"><div class="output-title"><span>Observed output</span><span>${result.elapsed_ms.toLocaleString()} ms · includes setup + check</span></div><pre>${escape(result.output||'(No printed output. Use show(...) or print(...) to inspect a result.)')}</pre></div>
  <p class="feedback ${result.passed?'':'error'}">${escape(result.feedback)}</p>
  <div class="evidence-grid">${[[e.rows,'Visible rows'],[e.live_files,'Live data files'],[e.snapshots,'Retained snapshots'],[e.schema_id,'Current schema ID']].map(([v,label])=>`<div class="metric"><strong>${v}</strong><span>${label}</span></div>`).join('')}</div>
  <details class="evidence-details"><summary>Snapshot history & current metadata</summary><pre>${escape(JSON.stringify({metadata:e.metadata,spec_id:e.spec_id,history:e.history},null,2))}</pre></details>
  <details class="evidence-details"><summary>Inspect warehouse · ${e.warehouse.length} physical files</summary><p>Includes current and retained files. Click a file to decode it in the worker. Available until the next run or restart.</p><div class="file-list">${e.warehouse.map((f,i)=>`<button data-file="${i}" ${warehouseOwner===current.id?'':'disabled'}>${escape(f.path)} <span>(${f.bytes.toLocaleString()} B)</span></button>`).join('')}</div><pre id="inspector" class="inspector">Select a file to inspect its contents.</pre></details>
  <button class="button subtle" id="export-evidence">Export evidence ↓</button>`;
  $('export-evidence').onclick=()=>download(JSON.stringify({...result,exported_at:new Date().toISOString(),runtime:'Pyodide 314.0.3 / PyIceberg 0.11.1'},null,2),`iceberg-${result.lesson}-evidence.json`,'application/json');
  document.querySelectorAll('[data-file]').forEach(button=>button.onclick=()=>{
    if(busy||warehouseOwner!==current.id)return;
    $('inspector').textContent='Decoding file locally…';setBusy(true);
    worker.postMessage({type:'inspect',path:e.warehouse[Number(button.dataset.file)].path});
  });
  updateRuntime();
}
function route(){
  const id=location.hash.replace('#lesson/','');
  current=lessons.find(l=>l.id===id)||null;
  if(current)renderLesson(current);else if(location.hash==='#guide')guide();else home();
  renderNav();
  document.title=current?`${current.title} · Iceberg Lab`:location.hash==='#guide'?'Your laboratory · Iceberg Lab':'Iceberg Lab · Understand the table';
  $('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');
  syncSidebar();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>{route();$('content').focus({preventScroll:true});});
route();
