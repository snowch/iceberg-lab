import {parts,lessons} from './lessons.js';
import {diagram,references} from './visuals.js';
import {renderRecap} from './recaps.js';
import {support,sectionReviews,paths,sectionOpeners} from './learning.js';
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
    <div class="facts"><span><i class="dot"></i>42 focused lessons</span><span><i class="dot"></i>About 5 minutes each</span><span><i class="dot"></i>No setup or account</span><span><i class="dot"></i>Local WASM execution</span></div>
    </div><div class="hero-art" role="img" aria-label="An iceberg above and below the water, illustrating the table structure beneath a simple query."><span class="art-overline">A SIMPLE QUERY. A DEEPER STRUCTURE.</span><svg viewBox="0 0 360 300" aria-hidden="true"><defs><linearGradient id="ice" x2="0" y2="1"><stop stop-color="#f4ffff"/><stop offset="1" stop-color="#94c8ce"/></linearGradient></defs><path d="M25 152 Q100 135 180 153 T340 150" fill="none" stroke="#81b9c1" opacity=".6"/><path d="m75 146 88-115 42 69 35-39 49 87Z" fill="url(#ice)"/><path d="m163 31 4 115h-92Z" fill="#d4eded"/><path d="m205 100-38 46h122l-49-85Z" fill="#a1c7d0"/><path d="m67 165 62 95 49-28 47 47 73-115Z" fill="#76bcc8" opacity=".25"/><path d="m67 165 111 67-49 28Z" fill="#92dae1" opacity=".3"/><path d="m178 232 47 47 20-114Z" fill="#9dd9df" opacity=".2"/><path d="M28 158h304" stroke="#b2e5e6" opacity=".7" stroke-dasharray="4 5"/><circle cx="167" cy="109" r="4" fill="#fff"/><path d="M167 109h136V55" fill="none" stroke="#fff" opacity=".65"/><text x="300" y="45" fill="#e0f3f3" font-size="11" text-anchor="end">One table</text><text x="180" y="300" fill="#bad8dc" font-size="11" text-anchor="middle" letter-spacing="2">FOLLOW WHAT IS BENEATH</text></svg><span class="art-caption">Files · metadata · snapshots · safe change</span></div>
    <div class="metadata-map" role="img" aria-label="A catalog points to table metadata, then to a manifest list, then manifests, then data files."><div class="map-label">One table. A chain of evidence.</div><div class="map-flow">
    <div class="map-node">Catalog<small>Find the table</small></div><span class="map-arrow">→</span>
    <div class="map-node">Metadata<small>Choose a state</small></div><span class="map-arrow">→</span>
    <div class="map-node">Manifest list<small>Find manifests</small></div><span class="map-arrow">→</span>
    <div class="map-node">Manifests<small>Select files</small></div><span class="map-arrow">→</span>
    <div class="map-node">Data files<small>Read the rows</small></div></div></div></section>
    <section class="course-readiness" aria-label="Course prerequisites"><h2>Before you start</h2><p>This course is for people who work with tables and want to explain how an Iceberg table behaves. Be familiar with rows and columns. For the experiments, you should be able to read basic SQL (<code>SELECT</code>, <code>WHERE</code>, <code>GROUP BY</code>) and short Python examples using function calls, lists, dictionaries and loops.</p><p>No prior Iceberg, Spark, Java or cloud-platform knowledge is required. Knowing that Parquet stores tabular data in files is helpful; its byte-level details are optional. You can also follow the diagrams, worked explanations and transcripts without running code.</p><a href="#guide">Read the laboratory guide →</a></section>
    <section class="path-section" aria-label="Suggested learning paths"><div class="section-intro"><h2>Choose your way in</h2><p>Start at the beginning, or follow your next question.</p></div><div class="path-grid">${paths.map((path,i)=>`<a class="path-card" href="#lesson/${path.start}"><span class="path-index">0${i+1} / ${path.time}</span><h3>${path.title} <span>→</span></h3><p>${path.desc}</p><small>Sections ${path.parts.map(p=>parts[p][0]).join(' · ')}</small></a>`).join('')}</div><p class="path-note">Every lesson starts with fresh data. If a term is unfamiliar, use “The idea” and the optional hints before running code.</p></section>
    <div class="section-intro"><h2>From a file to a governed table</h2><p>Seven sections. One idea per lesson.</p></div>
    <div class="course-grid">${parts.map(([number,title,desc],part)=>`<section class="part-card"><span class="part-number">PART ${number} / 6 LESSONS</span><h3>${title}</h3><p>${desc}</p><div class="card-lessons">${lessons.filter(l=>l.part===part).map(l=>`<a href="#lesson/${l.id}"><span>${String(lessons.indexOf(l)+1).padStart(2,'0')}</span>${l.title} →</a>`).join('')}</div><span class="section-progress">${lessons.filter(l=>l.part===part&&reviewed.includes(l.id)).length} of 6 reviewed</span></section>`).join('')}</div>
    <div class="reading-note"><p><strong>Learn by investigating.</strong> Make a prediction, run the experiment, inspect the evidence, then change one thing. Every lesson has a worked explanation, so you can read first and run when ready.</p></div>
    <p class="story">Know basic SQL and a little Python. The <a href="https://snowch.github.io/parquet-book/">Parquet lab</a> explains the file beneath the table; the <a href="https://snowch.github.io/query-engine-book/">Query Engine lab</a> follows the work above it. You can start here without completing either.</p>`;
}
function guide(){
  $('content').innerHTML=`<article class="guide"><div class="eyebrow">Reference / Your laboratory</div><h1>A real table.<br>Inside your tab.</h1>
  <p class="lead">The page downloads a Python WASM runtime on your first experiment. PyIceberg creates the table, Arrow writes the files, and DuckDB runs SQL locally.</p>
  <section><h2>Prerequisites and reading paths</h2><p>Start with familiarity with tables, rows and columns. To investigate by editing code, be able to read basic SQL SELECT, WHERE and GROUP BY statements and short Python examples with function calls, lists, dictionaries and loops. This is an Iceberg course, not a first course in SQL or Python.</p><p>You do not need Iceberg, Spark, Java, a cloud account or object-storage administration experience. Knowing what a Parquet file is will help; understanding its binary format is optional. The Parquet lab is a companion, not a required prerequisite.</p><p>For a reading path, use the concept diagrams and worked explanations, then explain each mechanism in your own words. Optional captioned videos and transcripts cover selected processes. Experiment checks provide evidence about the code; they do not certify mastery merely for pressing Run.</p></section>
  <section><h2>How a lesson works</h2><p>Each lesson asks one question. Predict the outcome, run the editable Python, inspect its output and the warehouse, then compare it with the worked result. Try the suggested variation and answer the explanation check.</p><p>Use the optional prediction and reflection notes to record your reasoning. They are saved only in this browser. Hints offer a starting point before revealing what evidence to inspect. Each section ends with an unfamiliar scenario and a self-review rubric; use it to test transfer rather than recognition.</p><p>Every run recreates that lesson’s fixture. It does not continue the previous run or previous lesson. Your code edits and review progress are saved in this browser when storage is available. The warehouse itself is held in worker memory and is lost on reload, stopping the runtime, or starting another experiment.</p><p>Use <strong>Mark reviewed</strong> to track a reading path. It is a personal bookmark, not a certificate. Passing the original code check and the explanation question also marks the lesson reviewed. Variations may deliberately fail the original check; inspect the result and explain why.</p></section>
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
  <nav class="lesson-steps" aria-label="Lesson stages"><a href="#" data-jump="prediction">01 Predict</a><a href="#" data-jump="experiment">02 Investigate</a><a href="#" data-jump="worked">03 Explain</a><a href="#" data-jump="quiz">04 Apply</a></nav>
  ${idx%6===0?`<section class="section-opener" aria-label="Why this section matters"><h2>${escape(sectionOpeners[l.part].title)}</h2>${sectionOpeners[l.part].paragraphs.map(paragraph=>`<p>${escape(paragraph)}</p>`).join('')}</section>`:''}
  ${idx===0?'<p class="first-lesson-readiness"><strong>Before you start:</strong> be familiar with tables, rows and columns. Basic SQL and reading short Python examples help with the experiments. Iceberg knowledge is not assumed. You can follow the worked explanations without running code. <a href="#guide">Prerequisites and laboratory guide</a>.</p>':''}
  <p class="goal">${escape(l.goal)}</p><p class="story">${escape(l.story)}</p>
  <section class="concept"><span class="step-label">The idea</span><p>${escape(support[l.id].concept)}</p></section>
  <div class="predict" id="prediction"><div class="stage-heading"><span class="step-label">01 / Predict</span><h2>Make a prediction</h2></div><div><p>${escape(l.predict)}</p><label class="prediction-label" for="prediction-note">Your prediction and why <span>· optional, saved here</span></label><textarea id="prediction-note" class="learning-note" rows="2" placeholder="I expect… because…">${escape(store.get('prediction:'+l.id,''))}</textarea></div></div>
  <section class="experiment" id="experiment" aria-label="Editable experiment"><div class="experiment-head stage-heading"><span class="step-label">02 / Investigate</span><h2>Run the investigation</h2></div>
  <div class="scaffold-row"><details class="learning-hint"><summary>Need a starting point?</summary><p>${escape(support[l.id].hint)}</p><details><summary>What evidence should I look for?</summary><p>${escape(support[l.id].notice)}</p></details></details><span class="fixture-reminder">Each run starts fresh.</span></div>
  <div id="runtime-status" class="runtime-status" role="status"><i class="dot"></i><span></span></div>
  <details class="code-orientation"><summary>New to the code?</summary><p><code>table</code> is the real Iceberg table prepared for this lesson. <code>show(...)</code> prints evidence. <code>files()</code> lists the planned data files, and <code>metrics(...)</code> summarizes a scan. You can run the example unchanged first, then edit one value. Each run recreates the fixture; nothing from an earlier lesson is required.</p><p><code>sql(...)</code> runs DuckDB over an already materialized Iceberg scan. To study Iceberg pruning, pass a predicate to <code>metrics(...)</code> or <code>table.scan(row_filter=...)</code>. <a href="#guide">Read the laboratory guide</a> for definitions and runtime limits.</p></details>
  <div class="editor-shell"><div class="editor-bar"><span>experiment.py · editable Python</span><button id="reset-code">Reset code</button></div><label class="sr-only" for="code">Experiment code</label><textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Editable Python experiment">${escape(saved)}</textarea></div>
  <div class="run-bar"><button id="run" class="button primary">Run experiment <span>→</span></button><button id="stop" class="button subtle" ${worker?'':'hidden'}>Stop / restart</button><button id="export" class="button" disabled>Export warehouse ↓</button><span class="hint">Fresh fixture on every run · Ctrl / ⌘ + Enter</span></div>
  <details class="setup"><summary>Fixture setup & evidence check</summary><p>Executed before your code; each run starts independently.</p><pre>${escape(l.setup)}</pre><p>The evidence check below runs after your code. Variations can legitimately change these expected results.</p><pre>${escape(l.check)}</pre><p><a href="./python/lab.py">Read the fixture helpers</a> · <a href="#guide">Runtime & limits</a></p></details>
  <div id="result" aria-live="polite"></div></section>
  <details class="worked" id="worked"><summary><span class="step-label">03 / Explain</span> <span class="worked-heading">Compare with the worked result</span></summary><p>${escape(l.worked)}</p></details>
  ${diagram(l.id)}
  <section class="change-box"><div class="step-label">04 / Apply</div><h2>Test your explanation</h2><p>${escape(l.change)}</p></section>
  <form class="quiz" id="quiz"><h2>Explain what happened</h2><p class="question">${escape(l.question)}</p>${choices.map(c=>`<label><input type="radio" name="answer" value="${c.index}" required><span>${escape(c.text)}</span></label>`).join('')}<button class="button" type="submit">Check explanation →</button><p class="quiz-feedback" id="quiz-feedback" role="status"></p></form>
  <section class="reflection"><label for="reflection-note">Explain it in your own words</label><p>What did the evidence change about your prediction? Name one situation where this idea would help.</p><textarea id="reflection-note" class="learning-note" rows="2" placeholder="The evidence shows… This matters when…">${escape(store.get('reflection:'+l.id,''))}</textarea></section>
  ${idx%6===5?`<section class="transfer"><span class="step-label">Section ${parts[l.part][0]} / Use it elsewhere</span><h2>${sectionReviews[l.part][0]}</h2><p>${sectionReviews[l.part][1]}</p><details><summary>Review your explanation</summary><ul>${sectionReviews[l.part][2].map(point=>`<li>${point}</li>`).join('')}</ul><p>Explain this without looking back. If a link is missing, revisit one lesson and try again.</p></details></section>`:''}
  <div class="review-bar"><span id="review-text"></span><button id="review" class="button subtle"></button></div>
  <section class="study-resources" aria-label="Further study">${renderRecap(l.id)}${references(l)}</section>
  <nav class="pagination" aria-label="Lesson navigation"><a href="${prev?'#lesson/'+prev.id:'#'}"><small>← ${prev?'Previous lesson':'Course overview'}</small>${prev?.title||'See the learning path'}</a><a href="${next?'#lesson/'+next.id:'#'}"><small>${next?'Next lesson':'Back to overview'} →</small>${next?.title||'Review your learning'}</a></nav></article>`;
  for(const [element,key] of [['prediction-note','prediction'],['reflection-note','reflection']]){
    $(element).oninput=()=>store.set(key+':'+l.id,$(element).value);
  }
  document.querySelectorAll('[data-jump]').forEach(link=>link.onclick=event=>{
    event.preventDefault();const target=$(link.dataset.jump);if(target.tagName==='DETAILS')target.open=true;
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  });
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
    $('quiz-feedback').textContent=ok?'Correct. '+l.choices[l.answer]+'. Explain how your evidence supports this.':'Try again using this evidence: '+support[l.id].notice+' Open the worked result if you need the full explanation.';
    if(ok&&passRuns.has(l.id))markReviewed(l.id);
  };
  $('review').onclick=()=>{
    if(reviewed.includes(l.id))reviewed=reviewed.filter(id=>id!==l.id);
    else reviewed.push(l.id);
    store.set('reviewed',reviewed);renderNav();updateReview();
  };
  document.querySelectorAll('.recap').forEach(resource=>resource.addEventListener('toggle',()=>{if(!resource.open)resource.querySelector('video')?.pause();}));
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
  <p class="feedback ${result.passed?'':'error'}">${escape(result.feedback)}</p><p class="evidence-cue"><strong>Read the evidence:</strong> ${escape(support[result.lesson].notice)}${result.passed?'':' A changed experiment may intentionally differ from the original check; compare the output before deciding it is wrong.'}</p>
  <div class="evidence-grid">${[[e.rows,'Visible rows'],[e.live_files,'Live data files'],[e.snapshots,'Retained snapshots'],[e.schema_id,'Current schema ID']].map(([v,label])=>`<div class="metric"><strong>${v}</strong><span>${label}</span></div>`).join('')}</div>
  <details class="evidence-details"><summary>Snapshot history & current metadata</summary><pre>${escape(JSON.stringify({metadata:e.metadata,spec_id:e.spec_id,history:e.history},null,2))}</pre></details>
  <details class="evidence-details"><summary>Inspect warehouse · ${e.warehouse.length} physical files</summary><p>Includes current and retained files. Click a file to decode it in the worker. Available until the next run or restart.</p><div class="file-list">${e.warehouse.map((f,i)=>`<button data-file="${i}" ${warehouseOwner===current.id?'':'disabled'}>${escape(f.path)} <span>(${f.bytes.toLocaleString()} B)</span></button>`).join('')}</div><pre id="inspector" class="inspector">Select a file to inspect its contents.</pre></details>
  <button class="button subtle" id="export-evidence">Export evidence ↓</button>`;
  $('export-evidence').onclick=()=>download(JSON.stringify({...result,prediction:store.get('prediction:'+result.lesson,''),reflection:store.get('reflection:'+result.lesson,''),exported_at:new Date().toISOString(),runtime:'Pyodide 314.0.3 / PyIceberg 0.11.1'},null,2),`iceberg-${result.lesson}-evidence.json`,'application/json');
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
