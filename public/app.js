import {parts,lessons} from './lessons.js';
import {diagram,references} from './visuals.js';
import {renderRecap} from './recaps.js';
import {support,sectionReviews,paths,sectionOpeners} from './learning.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatCopy = value => escape(value).replace(/`([^`]+)`/g,'<code>$1</code>');
const store = {
  get(key,fallback){try{return JSON.parse(localStorage.getItem('iceberg-v1:'+key)) ?? fallback;}catch{return fallback;}},
  set(key,value){try{localStorage.setItem('iceberg-v1:'+key,JSON.stringify(value));}catch{/* Storage can be disabled; learning still works. */}}
};
let reviewed = store.get('reviewed',[]).filter(id=>lessons.some(l=>l.id===id));
let worker, ready=false, busy=false, pending=null, current=null, activeRun=null, warehouseOwner=null;
let runtimeText='The first run loads the lesson tools (about 46 MB of files). This can take a few moments.';
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
  if(open){const active=$('sidebar').querySelector('[aria-current=page]');(active||$('search')).focus({preventScroll:true});active?.scrollIntoView({block:'nearest'});}
};
const mobile=matchMedia('(max-width:760px)');
function syncSidebar(){$('sidebar').inert=!$('sidebar').classList.contains('open');}
mobile.addEventListener('change',syncSidebar);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('sidebar').classList.contains('open')){
    $('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');syncSidebar();$('menu').focus();
  }
});
$('close-course').onclick=()=>{closeCourse();$('menu').focus();};
function closeCourse(){$('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');syncSidebar();}
document.addEventListener('pointerdown',event=>{if($('sidebar').classList.contains('open')&&!$('sidebar').contains(event.target)&&!$('menu').contains(event.target))closeCourse();});
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
    <section class="hero"><div class="hero-copy"><div class="eyebrow">The browser field guide <span> / Apache Iceberg</span></div>
    <h1>Understand the table.<br><em>See what changes.</em></h1>
    <p class="lead">Follow the files. Read less data. Change a table safely. Learn Iceberg through small experiments with real tables, running entirely in your browser.</p>
    <div class="actions"><a class="button primary" href="#lesson/${resume?.id||'catalog'}">${resume?'Continue learning':'Start the first lesson'} <span>→</span></a><a class="button" href="#guide">Explore your laboratory</a></div>
    <div class="facts"><span><i class="dot"></i>42 focused lessons</span><span><i class="dot"></i>About 5 minutes each</span><span><i class="dot"></i>No setup or account</span><span><i class="dot"></i>Runs in your browser</span></div>
    </div><div class="hero-art" role="img" aria-label="An iceberg above and below the water, illustrating the table structure beneath a simple query."><span class="art-overline">A SIMPLE QUERY. A DEEPER STRUCTURE.</span><svg viewBox="0 0 360 300" aria-hidden="true"><defs><linearGradient id="ice" x2="0" y2="1"><stop stop-color="#f4ffff"/><stop offset="1" stop-color="#94c8ce"/></linearGradient></defs><path d="M25 152 Q100 135 180 153 T340 150" fill="none" stroke="#81b9c1" opacity=".6"/><path d="m75 146 88-115 42 69 35-39 49 87Z" fill="url(#ice)"/><path d="m163 31 4 115h-92Z" fill="#d4eded"/><path d="m205 100-38 46h122l-49-85Z" fill="#a1c7d0"/><path d="m67 165 62 95 49-28 47 47 73-115Z" fill="#76bcc8" opacity=".25"/><path d="m67 165 111 67-49 28Z" fill="#92dae1" opacity=".3"/><path d="m178 232 47 47 20-114Z" fill="#9dd9df" opacity=".2"/><path d="M28 158h304" stroke="#b2e5e6" opacity=".7" stroke-dasharray="4 5"/><circle cx="167" cy="109" r="4" fill="#fff"/><path d="M167 109h136V55" fill="none" stroke="#fff" opacity=".65"/><text x="300" y="45" fill="#e0f3f3" font-size="11" text-anchor="end">One table</text><text x="180" y="300" fill="#bad8dc" font-size="11" text-anchor="middle" letter-spacing="2">FOLLOW WHAT IS BENEATH</text></svg><span class="art-caption">Files · metadata · snapshots · safe change</span></div>
    <div class="metadata-map" role="img" aria-label="A catalog points to table metadata, then to a manifest list, then manifests, then data files."><div class="map-label">One table. A chain of evidence.</div><div class="map-flow">
    <div class="map-node">Catalog<small>Find the table</small></div><span class="map-arrow">→</span>
    <div class="map-node">Metadata<small>Choose a state</small></div><span class="map-arrow">→</span>
    <div class="map-node">Manifest list<small>Find manifests</small></div><span class="map-arrow">→</span>
    <div class="map-node">Manifests<small>Select files</small></div><span class="map-arrow">→</span>
    <div class="map-node">Data files<small>Read the rows</small></div></div></div></section>
    <section class="course-readiness" aria-label="Course prerequisites"><h2>Before you start</h2><p>This course is for people who work with tables and want to explain how an Iceberg table behaves. Be familiar with rows and columns. For the experiments, you should be able to read basic SQL (<code>SELECT</code>, <code>WHERE</code>, <code>GROUP BY</code>) and short Python examples using function calls, lists, dictionaries and loops.</p><p>No prior Iceberg, Spark, Java or cloud-platform knowledge is required. Knowing that Parquet stores tabular data in files is helpful; its byte-level details are optional. You can also follow the diagrams, worked explanations and transcripts without running code.</p><a href="#guide">Read the laboratory guide →</a></section>
    <section class="path-section" aria-label="Suggested learning paths"><div class="section-intro"><h2>Choose your way in</h2><p>Start at the beginning, or follow your next question.</p></div><div class="path-grid">${paths.map((path,i)=>`<a class="path-card" href="#lesson/${path.start}"><span class="path-index">0${i+1} / ${path.time}</span><h3>${path.title} <span>→</span></h3><p>${path.desc}</p><small>Sections ${path.parts.map(p=>parts[p][0]).join(' · ')}</small></a>`).join('')}</div><p class="path-note">Every lesson starts with fresh data. If a term is unfamiliar, read the lesson’s opening explanation and “What the result means”.</p></section>
    <div class="section-intro"><h2>From a file to a governed table</h2><p>Seven sections. One idea per lesson.</p></div>
    <div class="course-grid">${parts.map(([number,title,desc],part)=>`<section class="part-card"><span class="part-number">PART ${number} / 6 LESSONS</span><h3>${title}</h3><p>${desc}</p><div class="card-lessons">${lessons.filter(l=>l.part===part).map(l=>`<a href="#lesson/${l.id}"><span>${String(lessons.indexOf(l)+1).padStart(2,'0')}</span>${l.title} →</a>`).join('')}</div><span class="section-progress">${lessons.filter(l=>l.part===part&&reviewed.includes(l.id)).length} of 6 reviewed</span></section>`).join('')}</div>
    <div class="reading-note"><p><strong>Learn by investigating.</strong> Make a prediction, run the experiment, inspect the evidence, then change one thing. Every lesson has a worked explanation, so you can read first and run when ready.</p></div>
    <p class="story">For more background, the <a href="https://snowch.github.io/parquet-book/">Parquet lab</a> explains the file beneath the table; the <a href="https://snowch.github.io/query-engine-book/">Query Engine lab</a> follows the work above it. You can start here without completing either.</p>`;
}
function guide(){
  $('content').innerHTML=`<article class="guide"><div class="eyebrow">Reference / Your laboratory</div><h1>A real table.<br>Inside your tab.</h1>
  <p class="lead">The page downloads a Python WASM runtime on your first experiment. PyIceberg creates the table, Arrow writes the files, and DuckDB runs SQL locally.</p>
  <section><h2>Prerequisites and reading paths</h2><p>Start with familiarity with tables, rows and columns. To investigate by editing code, be able to read basic SQL SELECT, WHERE and GROUP BY statements and short Python examples with function calls, lists, dictionaries and loops. This is an Iceberg course, not a first course in SQL or Python.</p><p>You do not need Iceberg, Spark, Java, a cloud account or object-storage administration experience. Knowing what a Parquet file is will help; understanding its binary format is optional. The Parquet lab is a companion, not a required prerequisite.</p><p>For a reading path, use the concept diagrams and worked explanations, then explain each mechanism in your own words. Optional captioned videos and transcripts cover selected processes. Experiment checks provide evidence about the code; they do not certify mastery merely for pressing Run.</p></section>
  <section><h2>How a lesson works</h2><p>Each lesson asks one question. Predict the outcome, run the editable Python, inspect its output and the warehouse, then compare it with the worked result. Try the suggested variation and answer the explanation check.</p><p>Use Your notes if you want to save a prediction and explanation. They are saved only in this browser. Each example states what the page prepares automatically, what to run and which output values to inspect. Each section ends with an unfamiliar scenario and a self-review rubric; try answering it without looking back, then use the checklist to review your reasoning.</p><p>Every run recreates that lesson’s starting table or model. It does not continue the previous run or previous lesson. Your code edits and review progress are saved in this browser when storage is available. The warehouse itself is held in worker memory and is lost on reload, stopping the runtime, or starting another experiment.</p><p>Use <strong>Mark reviewed</strong> to track a reading path. It is a personal bookmark, not a certificate. Passing the original code check and the explanation question also marks the lesson reviewed. Edited examples can produce valid results that differ from the original checks. They are labelled as edited runs rather than graded as failures.</p></section>
  <section><h2>What actually runs</h2><table><thead><tr><th>Layer</th><th>Pinned implementation</th></tr></thead><tbody>
  <tr><td>Interpreter</td><td>Pyodide 314.0.3, in a Web Worker</td></tr><tr><td>Table library</td><td>PyIceberg 0.11.1 · format v2 examples</td></tr><tr><td>Catalog</td><td>PyIceberg SqlCatalog on local SQLite</td></tr><tr><td>Files</td><td>Real metadata JSON, Avro manifests and Parquet</td></tr><tr><td>Data / SQL</td><td>PyArrow 22.0.0 / DuckDB 1.5.1</td></tr><tr><td>Data</td><td>120 invented orders in the usual starting table; no personal data</td></tr></tbody></table>
  <p>Self-hosted runtime assets cost roughly 46 MB uncompressed on first load. Browser caching and compression affect actual transfer. Startup may take tens of seconds. Nothing is downloaded for computation until you select Run. Static lesson assets load normally.</p>
  <p>There are no cloud credentials, remote catalog services, query servers or analytics trackers. After runtime assets load, experiments require no network services. This is not an offline-installed application; navigation after a full offline reload depends on the browser cache.</p></section>
  <section><h2>Read the evidence correctly</h2><ul><li><strong>Table experiments</strong> use PyIceberg and real table files.</li><li><strong>Models</strong> are described as calculations or policy scenarios in their introductions. These do not demonstrate distributed services or production enforcement.</li><li><strong>Candidate records</strong> are rows in selected files, not necessarily rows examined by every downstream operator.</li><li><strong>Selected file bytes</strong> sum file sizes; they are not measured bytes read, HTTP traffic or billing.</li></ul>
  <p>The sql helper first reads the Iceberg scan into an Arrow table in memory, then makes that table available to DuckDB. SQL WHERE clauses do not feed predicates back into the Iceberg scan. Use <code>table.scan(row_filter=...)</code> or <code>metrics(predicate)</code> when investigating Iceberg pruning.</p></section>
  <section><h2>Runtime boundaries</h2><p>This pinned build supports real identity partition writes, schema changes, snapshot reads, tags, copy-on-write deletes and metadata-only snapshot expiration. Day and bucket partition writes need a native helper absent from this WASM build. Merge-on-read delete files and distributed compaction are not implemented here.</p><p>Small-table consolidation uses a full overwrite. Snapshot expiration removes references but does not physically delete files in this implementation. Concurrent commits use a sequential interleaving against the real SQLite catalog. This cannot measure distributed catalog behavior, conflict timing or cluster throughput.</p><p>Two compatibility shims adapt upstream Python scheduling to a synchronous executor and reject unavailable S3 filesystem use. They do not implement or synthesize Iceberg metadata.</p><p>Governance exercises expose intended access paths and failure modes. Code running under the learner’s control cannot provide trusted authorization, tamper-resistant audit or proof of regulatory compliance.</p></section>
  <section><h2>Vocabulary to keep nearby</h2><table><thead><tr><th>Term</th><th>Meaning in this lab</th></tr></thead><tbody>
  <tr><td>Catalog</td><td>Resolves a table name and coordinates publication of its current metadata.</td></tr>
  <tr><td>Snapshot</td><td>A table state identified by an ID, with references to its manifest list.</td></tr>
  <tr><td>Manifest list</td><td>An Avro file listing manifests and summaries for one snapshot.</td></tr>
  <tr><td>Manifest</td><td>An Avro file containing data-file or delete-file entries and their metrics.</td></tr>
  <tr><td>Field ID</td><td>A stable identity for a column, independent of its current name or position.</td></tr>
  <tr><td>Partition specification</td><td>Source fields and transforms used to partition files. Old files retain the spec that wrote them.</td></tr>
  <tr><td>Pruning</td><td>Ruling out files or other units that cannot contain matching data.</td></tr>
  <tr><td>Residual predicate</td><td>The row condition that still needs to be tested inside the files a planner has selected.</td></tr>
  <tr><td>Copy-on-write</td><td>Replacing affected data files to apply row changes.</td></tr>
  <tr><td>Merge-on-read</td><td>Combining data with supported row-delete information during reads.</td></tr>
  <tr><td>Compaction</td><td>Rewriting data into a more useful physical layout while preserving its logical contents.</td></tr>
  <tr><td>Expiration</td><td>Removing eligible snapshot history from current table metadata; physical cleanup is a separate concern here.</td></tr>
  <tr><td>Orphan file</td><td>A file not referenced by any table state that must be retained. Cleanup must also account for writes still in progress and a safe minimum file age.</td></tr>
  <tr><td>Optimistic concurrency</td><td>Preparing a change, then validating its requirements against current state at commit time.</td></tr>
  </tbody></table></section>
  <section><h2>Inspect and export</h2><p>After a run, open Code, files and checks and select a file under Files on disk to read its JSON, Avro or Parquet metadata. Export warehouse downloads a ZIP containing the catalog and files, including retained historical data. It exports the most recent experiment in this worker. It does not persist that warehouse into the next lesson.</p><p>Metadata contains absolute <code>file:///warehouse/...</code> paths. To reopen an export, extract at <code>/warehouse</code> in an isolated environment and use a compatible PyIceberg SqlCatalog with <code>sqlite:////warehouse/catalog.db</code>. Moving it elsewhere requires a deliberate path relocation; an arbitrary unzip location is not portable. The exported SQLite catalog is an instructional local catalog, not a REST catalog.</p><p>Export evidence separately to save your code, starting setup, check result and table state. No cloud upload is performed.</p></section>
  <section><h2>If something fails</h2><p>Use Stop to interrupt a running example, then click Run experiment to start again. Use Reset runtime under Code, files and checks if you need to discard the current Python state. This discards its in-memory warehouse. Reset code restores the original example. If the runtime cannot load, check access to this site’s static assets and available browser memory. Read the worked explanation while it loads; try a current desktop Chrome, Firefox or Safari.</p></section>
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
  <h1>${l.title}</h1><div class="lesson-meta"><span>LESSON ${String(idx+1).padStart(2,'0')} / 42</span></div>
  ${idx%6===0?`<section class="section-opener" aria-label="Why this section matters"><h2>${escape(sectionOpeners[l.part].title)}</h2>${sectionOpeners[l.part].paragraphs.map(paragraph=>`<p>${escape(paragraph)}</p>`).join('')}</section>`:''}
  ${idx===0?'<p class="first-lesson-readiness"><strong>Before you start:</strong> be familiar with tables, rows and columns. Basic SQL and reading short Python examples help with the experiments. Iceberg knowledge is not assumed. You can follow the worked explanations without running code. <a href="#guide">Prerequisites and laboratory guide</a>.</p>':''}
  <p class="goal"><strong>In this lesson:</strong> ${escape(l.goal)}</p>${idx%6!==0?`<p class="story">${escape(l.story)}</p>`:''}
  <section class="prediction" id="prediction"><h2>Before you run</h2><p>${escape(l.predict)}</p></section>
  <section class="experiment" id="experiment" aria-label="Editable experiment"><h2>Run the example</h2>
  <p class="prepared-state">${formatCopy(support[l.id].prepared)}</p><p class="run-instructions">${formatCopy(support[l.id].action)}</p>
  <div id="runtime-status" class="runtime-status" role="status"><span></span></div>
  <div class="editor-shell"><div class="editor-bar"><span>Python example · you can edit this</span><button id="reset-code">Reset code</button></div><label class="sr-only" for="code">Editable Python example</label><textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Editable Python experiment">${escape(saved)}</textarea></div>
  <div class="run-bar"><button id="run" class="button primary">Run experiment <span>→</span></button><button id="stop" class="button subtle" hidden>Stop</button></div>
  <div id="result" aria-live="polite"></div>
  <details class="technical-details" id="technical-details"><summary>Code, files and checks (optional)</summary><h3>How this example works</h3><p>${formatCopy(support[l.id].explanation)}</p><h3>Automatic preparation</h3><p>The page runs the following command before the code in the editor. You do not need to type or run it yourself. Every run recreates this starting state.</p><pre>${escape(l.setup)}</pre><h3>Check for the original example</h3><p>These checks describe the unchanged example. Editing the code can produce a valid result that differs from them.</p><pre>${escape(l.check)}</pre><div id="technical-result"><p>Run the example to inspect its files.</p></div><div class="advanced-actions"><button id="export" class="button" disabled>Export warehouse ↓</button><button id="reset-runtime" class="button subtle">Reset runtime</button></div><p class="technical-note">Export warehouse downloads the table files. Reset runtime discards the current table; Run experiment will reload the tools. Your saved code and notes are kept. <a href="./python/lab.py">Read the preparation and helper code</a> or <a href="#guide">open the laboratory guide</a>.</p></details>
  </section>
  <section class="worked" id="worked"><h2>What the result means</h2><p class="original-result-label">With the original code:</p><p>${escape(l.worked)}</p></section>
  ${diagram(l.id)}
  <section class="change-box"><h2>Try one change</h2><p>${formatCopy(l.change)}</p></section>
  <form class="quiz" id="quiz"><h2>Check your understanding</h2><p class="question">${escape(l.question)}</p>${choices.map(c=>`<label><input type="radio" name="answer" value="${c.index}" required><span>${escape(c.text)}</span></label>`).join('')}<button class="button" type="submit">Check explanation →</button><p class="quiz-feedback" id="quiz-feedback" role="status"></p></form>
  ${idx%6===5?`<section class="transfer"><span class="step-label">Section ${parts[l.part][0]} / Use it elsewhere</span><h2>${sectionReviews[l.part][0]}</h2><p>${sectionReviews[l.part][1]}</p><details><summary>Review your explanation</summary><ul>${sectionReviews[l.part][2].map(point=>`<li>${point}</li>`).join('')}</ul><p>Explain this without looking back. If a link is missing, revisit one lesson and try again.</p></details></section>`:''}
  <div class="review-bar"><button id="review" class="button subtle"></button><span id="review-text" role="status"></span></div>
  <section class="study-resources" aria-label="Optional notes and further study"><details class="lesson-resource lesson-notes"><summary><span><strong>Your notes (optional)</strong></span></summary><div class="resource-body"><p>These notes are saved in this browser. They are not submitted or graded.</p><label for="prediction-note">Your prediction and why</label><textarea id="prediction-note" class="learning-note" rows="2" placeholder="I expect… because…">${escape(store.get('prediction:'+l.id,''))}</textarea><label for="reflection-note">Explain it in your own words</label><p>What did you notice, and why does it matter?</p><textarea id="reflection-note" class="learning-note" rows="2" placeholder="I noticed… This matters because…">${escape(store.get('reflection:'+l.id,''))}</textarea></div></details>${renderRecap(l.id)}${references(l)}</section>
  <nav class="pagination" aria-label="Lesson navigation"><a href="${prev?'#lesson/'+prev.id:'#'}"><small>← ${prev?'Previous lesson':'Course overview'}</small>${prev?.title||'See the learning path'}</a><a href="${next?'#lesson/'+next.id:'#'}"><small>${next?'Next lesson':'Back to overview'} →</small>${next?.title||'Review your learning'}</a></nav></article>`;
  for(const [element,key] of [['prediction-note','prediction'],['reflection-note','reflection']]){
    $(element).oninput=()=>store.set(key+':'+l.id,$(element).value);
  }
  $('code').style.height=Math.min(600,Math.max(190,saved.split('\n').length*22+30))+'px';
  $('code').oninput=()=>store.set('draft:'+l.id,$('code').value);
  $('code').onkeydown=event=>{
    if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();runLesson(l);}
  };
  $('reset-code').onclick=()=>{$('code').value=l.code;store.set('draft:'+l.id,l.code);};
  $('run').onclick=()=>runLesson(l);
  $('stop').onclick=stopWorker;
  $('reset-runtime').onclick=stopWorker;
  $('export').onclick=()=>{if(!busy&&warehouseOwner===l.id){setBusy(true);worker.postMessage({type:'export'});}};
  $('quiz').onsubmit=event=>{
    event.preventDefault();const picked=new FormData(event.currentTarget).get('answer');
    const ok=Number(picked)===l.answer;quizAnswers.set(l.id,ok);
    $('quiz-feedback').textContent=ok?'Correct. '+support[l.id].concept:'Read “What the result means”, then try again. '+support[l.id].read;
    if(ok&&passRuns.has(l.id))markReviewed(l.id);
  };
  $('review').onclick=()=>{
    if(reviewed.includes(l.id))reviewed=reviewed.filter(id=>id!==l.id);
    else reviewed.push(l.id);
    store.set('reviewed',reviewed);renderNav();updateReview();
  };
  document.querySelectorAll('.recap').forEach(resource=>resource.addEventListener('toggle',()=>{if(!resource.open)resource.querySelector('video')?.pause();}));
  updateRuntime();updateReview();
  if(results.has(l.id)&&!(busy&&activeRun?.id===l.id))renderResult(results.get(l.id));
}
function updateReview(){
  if(!$('review'))return;
  const done=reviewed.includes(current.id);
  $('review').textContent=done?'✓ Reviewed · undo':'Mark reviewed';
  $('review-text').textContent=done?'Saved in this browser.':'';
  $('review-text').hidden=!done;
}
function markReviewed(id){
  if(!reviewed.includes(id)){reviewed.push(id);store.set('reviewed',reviewed);renderNav();updateReview();}
}
function updateRuntime(){
  if(!$('runtime-status'))return;
  $('runtime-status').classList.toggle('busy',busy);
  $('runtime-status').querySelector('span').textContent=runtimeText;
  $('runtime-status').hidden=!busy&&ready;
  $('run').disabled=busy;
  $('run').innerHTML=busy?'Working…':'Run experiment <span>→</span>';
  $('stop').hidden=!busy;
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
      if(pending){const request=pending;pending=null;worker.postMessage(request);runtimeText='Preparing the table and running the example…';updateRuntime();}
      else setBusy(false);
    }
    if(data.type==='result'){
      const id=activeRun.id;
      data.source=activeRun.code;data.setup=activeRun.setup;data.lesson=id;
      results.set(id,data);warehouseOwner=id;
      if(data.passed){passRuns.add(id);if(quizAnswers.get(id))markReviewed(id);}else passRuns.delete(id);
      runtimeText='The example has finished.';setBusy(false);
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
      runtimeText='The code stopped. Check the error below, or use Reset code and run again.';
      pending=null;setBusy(false);
      showRunError(data.text);
    }
  };
  worker.onerror=event=>{
    runtimeText='The lesson tools could not load. Click Run experiment to try again.';pending=null;setBusy(false);
    showRunError(event.message||'The lesson tools could not load. Try running the example again.');
  };
  worker.postMessage({type:'boot'});
}
function stopWorker(){
  worker?.terminate();worker=null;ready=false;pending=null;activeRun=null;warehouseOwner=null;
  runtimeText='Stopped. Click Run experiment to reload the tools and recreate the example table.';setBusy(false);
  if($('inspector'))$('inspector').textContent='Runtime stopped; run this lesson again to inspect its files.';
}
function runLesson(l){
  if(busy)return;
  if(worker&&!ready){worker.terminate();worker=null;}
  $('result').replaceChildren();
  $('technical-result').innerHTML='<p>Run in progress.</p>';
  passRuns.delete(l.id);
  activeRun={type:'run',id:l.id,setup:l.setup,code:$('code').value,check:l.check};
  store.set('draft:'+l.id,activeRun.code);
  // Another run destroys the previous warehouse, even if the new code raises.
  warehouseOwner=null;setBusy(true);
  runtimeText=ready?'Preparing the table and running the example…':'Loading the lesson tools. The first run may take tens of seconds…';
  updateRuntime();
  if(!worker){pending=activeRun;startWorker();}
  else if(!ready){pending=activeRun;worker.postMessage({type:'boot'});}
  else worker.postMessage(activeRun);
}
function download(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type}));const link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showRunError(message){
  if(!$('result'))return;
  const lines=String(message).trim().split('\n').filter(Boolean);
  $('result').innerHTML=`<div class="output error"><div class="output-title">The code stopped</div><pre>${escape(lines.at(-1)||message)}</pre></div><p>Check the line you edited, or click Reset code to restore the original example. Then click Run experiment again.</p>`;
  if($('technical-result'))$('technical-result').innerHTML=`<h3>Full error message</h3><pre>${escape(message)}</pre>`;
}
function renderResult(result){
  const e=result.evidence, lesson=lessons.find(l=>l.id===result.lesson);
  const edited=result.source.trim()!==lesson.code.trim();
  const feedback=edited?'Your edited example finished. The explanation below describes the original code.':!result.passed?'The original example finished, but its check did not pass. Open Code, files and checks to inspect the check.':'';
  $('result').innerHTML=`<div class="output"><div class="output-title">Your result</div><pre>${escape(result.output||'The code finished without printing a result. Add show(...) to print a value you want to inspect.')}</pre></div>${feedback?`<p class="feedback ${!result.passed&&!edited?'error':''}">${feedback}</p>`:''}`;
  $('technical-result').innerHTML=`<p class="original-check-status">Original example checks: ${result.passed?'passed':'different result'}. ${edited?'You edited the example.':''}</p><h3>Table after this run</h3><p>${e.rows} rows · ${e.live_files} current data files · ${e.snapshots} retained snapshots</p><h3>Snapshot history and metadata address</h3><pre>${escape(JSON.stringify({metadata:e.metadata,spec_id:e.spec_id,history:e.history},null,2))}</pre><h3>Files on disk</h3><p>This includes files needed by older snapshots. Select a file to inspect it. The file list is available until the next run or runtime reset.</p><div class="file-list">${e.warehouse.map((f,i)=>`<button data-file="${i}" ${warehouseOwner===current.id?'':'disabled'}>${escape(f.path)} <span>(${f.bytes.toLocaleString()} B)</span></button>`).join('')}</div><pre id="inspector" class="inspector">Select a file above.</pre><button class="button subtle" id="export-evidence">Export evidence ↓</button>`;
  $('export-evidence').onclick=()=>download(JSON.stringify({...result,prediction:store.get('prediction:'+result.lesson,''),reflection:store.get('reflection:'+result.lesson,''),exported_at:new Date().toISOString(),runtime:'Pyodide 314.0.3 / PyIceberg 0.11.1'},null,2),`iceberg-${result.lesson}-evidence.json`,'application/json');
  document.querySelectorAll('[data-file]').forEach(button=>button.onclick=()=>{
    if(busy||warehouseOwner!==current.id)return;
    $('inspector').textContent='Reading the selected file…';setBusy(true);
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
