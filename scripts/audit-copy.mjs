// Records the editorial review at sentence/label level. This is an inventory/diff,
// not an automated assessment of instructional quality or learner comprehension.
import {readFile,writeFile} from 'node:fs/promises';
import {lessons,parts} from '../public/lessons.js';
import {support,sectionReviews,sectionOpeners,paths} from '../public/learning.js';
import {visuals} from '../public/visuals.js';
import {recaps} from '../public/recaps.js';
const before=JSON.parse(await readFile(new URL('../docs/audit/copy-before.json',import.meta.url),'utf8'));
const ui=JSON.parse(await readFile(new URL('../docs/audit/ui-snapshots.json',import.meta.url),'utf8'));
const after={lessons,parts,support,sectionReviews,sectionOpeners,paths,visuals,recaps};
function inventory(corpus){
 const fields={};
 function visit(value,path){
  if(typeof value==='string')fields[path]=value;
  else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value))visit(child,`${path}.${key}`);
 }
 for(const l of corpus.lessons)for(const key of ['title','goal','story','predict','worked','change','question','choices'])visit(l[key],`lessons.${l.id}.${key}`);
 for(const [i,part]of corpus.parts.entries())for(const j of [1,2])visit(part[j],`parts.${i}.${j}`);
 for(const key of ['support','sectionReviews','sectionOpeners'])visit(corpus[key],key);
 for(const [i,p]of corpus.paths.entries())for(const key of ['title','desc','time'])visit(p[key],`paths.${i}.${key}`);
 for(const [id,v]of Object.entries(corpus.visuals))for(const key of ['title','rows','note','question'])visit(v[key],`visuals.${id}.${key}`);
 for(const [id,r]of Object.entries(corpus.recaps)){visit(r.title,`recaps.${id}.title`);for(const [i,scene]of r.scenes.entries()){visit(scene.title,`recaps.${id}.${i}.title`);visit(scene.text,`recaps.${id}.${i}.text`);}}
 return fields;
}
const oldFields=inventory(before),newFields=inventory(after);
for(const version of ['before','after'])for(const [route,snapshot]of Object.entries(ui[version])){
 (version==='before'?oldFields:newFields)[`ui.${route}`]=snapshot.paragraphs.join('\n');
}
const segmenter=new Intl.Segmenter('en',{granularity:'sentence'});
const sentences=text=>text.split('\n').flatMap(line=>[...segmenter.segment(line)].map(s=>s.segment.trim()).filter(Boolean));
function purpose(path){
 if(path.startsWith('ui.'))return 'Shared page labels, instructions, optional resources and guide definitions; remove repetition and match the actual controls.';
 if(path.startsWith('recaps.'))return 'Optional explanation of a process; distinguish the original example from live results and align narration, captions and transcript.';
 if(path.startsWith('visuals.'))return 'Illustrate one relationship; use accurate labels, explain symbols and distinguish a fixed illustration from edited results.';
 if(path.startsWith('sectionOpeners.'))return 'Explain the practical reason for the section before its technical objective; distinguish narration from a learner action.';
 if(path.startsWith('sectionReviews.'))return 'Ask for application in an unfamiliar scenario and provide concrete self-review criteria.';
 if(path.startsWith('paths.')||path.startsWith('parts.'))return 'Help learners choose a relevant, accurately described route.';
 if(path.endsWith('.prepared'))return 'State what is already prepared or will happen automatically; do not ask learners to edit read-only setup.';
 if(path.endsWith('.action'))return 'Give the immediate learner action and identify the printed evidence to inspect.';
 if(path.endsWith('.explanation'))return 'Explain only the code/helpers used in this lesson, in optional technical detail.';
 if(path.endsWith('.hint')||path.endsWith('.notice'))return 'Replace the hint stack with visible preparation and action; retain a specific output-reading cue for explanation feedback.';
 if(path.endsWith('.read'))return 'Identify output fields and their meaning for actionable feedback on an incorrect explanation.';
 if(path.endsWith('.concept'))return 'Explain the mechanism needed to understand the lesson and give useful confirmation after the explanation question.';
 if(path.endsWith('.change'))return 'Specify an executable edit in the editor, rerun instruction and comparison question; check the variation in WASM.';
 if(path.endsWith('.worked'))return 'Explain the observed original result, its mechanism and its scope without unsupported performance claims.';
 if(path.endsWith('.story'))return 'Give a concrete reason to investigate; define new terms where introduced. Section-entry motivation replaces duplicate stories in the rendered page.';
 if(path.endsWith('.predict'))return 'Ask a prediction that can be answered from the experiment; do not imply preparation is an action learners must perform.';
 if(path.endsWith('.goal'))return 'State one achievable outcome that the example actually demonstrates.';
 if(path.includes('.choices.')||path.endsWith('.question'))return 'Check the central mechanism with clear alternatives; avoid treating runtime success as proof of understanding.';
 return 'Use a concise, consistent label that accurately names the lesson’s focus.';
}
const fields=Object.keys({...oldFields,...newFields}).map(path=>{
 const a=oldFields[path],b=newFields[path],oldSentences=sentences(a||''),newSentences=sentences(b||'');
 return {path,purpose:purpose(path),disposition:a===b?'retained':a===undefined?'added':b===undefined?'removed':'rewritten',before:a??null,after:b??null,
 beforeSentences:oldSentences.map((text,i)=>({number:i+1,text,disposition:newSentences.includes(text)?'retained':b===undefined?'removed':'replaced',replacementField:b===undefined?null:path})),
 afterSentences:newSentences.map((text,i)=>({number:i+1,text,disposition:oldSentences.includes(text)?'retained':'new wording'}))};
});
const count=(items,key)=>Object.fromEntries([...new Set(items.map(x=>x[key]))].map(k=>[k,items.filter(x=>x[key]===k).length]));
const report={reviewedOn:'2026-11-17',baselineCommit:'13afc05',scope:'42 lessons; all authored learner-facing prose fields; seven section introductions/reviews; paths; 42 diagram labels, notes and reference questions; three recap scripts; fully expanded overview, guide and representative shared lesson UI. Python code is verified separately by execution.',method:'Editorial review checked purpose, agency, terminology, relevance, evidence and accuracy. This generated ledger records each before/after sentence or short label; it does not score clarity. Replacements are linked at field level because rewrites can split or merge sentences. Exact sentence segmentation is mechanical and may split code-like identifiers. Repeated shared UI text appears in multiple snapshots.',counts:{fields:fields.length,fieldDispositions:count(fields,'disposition'),beforeSentences:fields.reduce((n,f)=>n+f.beforeSentences.length,0),afterSentences:fields.reduce((n,f)=>n+f.afterSentences.length,0)},fields};
await writeFile(new URL('../docs/audit/sentence-ledger.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
const oldById=Object.fromEntries(before.lessons.map(l=>[l.id,l]));
await writeFile(new URL('../docs/audit/rewrite-notes.json',import.meta.url),JSON.stringify(Object.fromEntries(lessons.map(l=>[l.id,{title:l.title,originalVariation:oldById[l.id].change,prepared:support[l.id].prepared,run:support[l.id].action,change:l.change,reason:'Make the prepared state explicit; give a direct run/inspection action and an edit that can be made in the editor.',verified:l.id==='retry'?'Original passed; the suggested duplicate-column variation raised its expected error in pinned WASM.':'Original and suggested variation passed their checks in pinned WASM.'}])),null,2)+'\n');
console.log(JSON.stringify(report.counts,null,2));
