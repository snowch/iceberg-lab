# Concept diagrams, recaps, references and learner readiness

## Decision and scope

Use visible concept diagrams for every lesson, and optional captioned videos only when following a process
adds value. The initial three pilots cover snapshot ancestry, pruning and atomic publication. The default
learning path remains predict → execute → explain → apply. Videos are not required to continue and do not
replace experiments. GPU Lab V2 supplied the reference pattern: visible relationship diagrams, optional
resource rows, real video assets, captions, transcripts, primary-source reading questions and comparisons.

All 42 lessons now have original diagrams and references. The diagrams are fixed worked illustrations, not
live outputs. Each caption/note identifies the relationship and its limits. Comparison rows are alternatives,
not timelines; arrows appear only in explicitly sequential flow diagrams. Parallel metadata lookups have no
sequence arrows. The diagrams follow the worked explanation so they do not precede the prediction task.

## Learner and learning contract

The established course is self-paced, aimed at people working with tabular data. Assume familiarity with
rows/columns. Experiment readers need basic SELECT/WHERE/GROUP BY and short Python examples with function
calls, lists, dictionaries and loops. Iceberg, Spark, Java, cloud credentials and Parquet internals are not
prerequisites. Parquet file familiarity is helpful. Reading can proceed through diagrams, worked explanations
and transcripts without running code. These assumptions are now explicit on the overview, first lesson and
laboratory guide; they are authoring assumptions, not claims from learner research.

The new material serves existing objectives, not another curriculum:

| Evidence/outcome | Visual relationship | Proof remains |
| --- | --- | --- |
| Trace file membership | Name → metadata → referenced files | Catalog, metadata and manifest experiments |
| Explain safe schema change | Stable IDs across stored/current names | Rename/add/drop-and-re-add checks |
| Evaluate scan work | Candidate ranges versus matching rows | Iceberg scan planning and result checks |
| Maintain history safely | Current and retained reference sets | Rewrite/delete/expiration experiments |
| Explain commits | Preparation, expected state and publication | Real stale-schema conflict plus named publication model |
| Identify governance boundaries | Catalog/engine/storage and retained-copy paths | Explicit policy models and source-guided explanation |
| Justify a layout | Same answer, competing work and risk | Comparison experiments and recommendation record |

The pinned Course Builder and UX Design skill sources linked by GPU Lab were inspected, alongside
Course Storytelling. Relevant alignment and progressive-disclosure principles informed this bounded
addition. This is not a claim of completing their full curriculum-design or storytelling workflows:
the course sequence and objectives are preserved, and no profile wiki, invented personal story, new
certification scheme or learner-comprehension claim was introduced.

Sources inspected:
- https://github.com/ericrisco/rsc-harness/blob/f3765d35e91690c0c7e511447da6cd0176ab38e0/skills/course-builder/SKILL.md
- https://github.com/ericrisco/rsc-harness/blob/f3765d35e91690c0c7e511447da6cd0176ab38e0/skills/course-storytelling/SKILL.md
- https://github.com/f0d010c/stark/blob/ff94e5b4e1c98d259f3cde9f806406c4528deed4/skills/ux-design/SKILL.md
- https://github.com/snowch/gpu-lab/blob/main/content/v2-diagrams.mjs
- https://github.com/snowch/gpu-lab/blob/main/content/v2-lesson-video.mjs

## UX decision and ergonomics

- Job/mode: first-time learning and returning-reference use, low-risk reading with reversible local edits.
- Pattern: one downward lesson, with a visible fixed diagram and optional resource disclosures after practice.
- Primary action: run the investigation. Secondary actions: open reference/video/transcript, inspect/export.
- Core path: context → prediction → experiment → observed output → worked explanation/diagram → application.
- Recovery: transcripts and source questions remain useful if video fails; downloads provide another playback path.
- Repeated-use speed: Course menu retains search, active-lesson focus and progress. Escape, close and outside
  click dismiss it. Lesson routes and saved notes remain stable. Wide diagrams/code/results use the working
  width; prose retains a shorter measure. No fixed sidebar consumes tablet width.
- State coverage: fixed illustrations are labelled before/after Run; worker result/error states are unchanged;
  native video controls cover play/pause/seek/captions, and visible text provides a fallback.
- Network: no autoplay, `preload=none`, no external player/analytics embeds. Posters are small; media starts only
  on playback. Both WebM VP9/Opus and MP4 H.264/AAC are supplied for browser codec differences.

## References contract

Each lesson links a relevant heading in the official Iceberg specification, a PyIceberg documentation entry
and the lab's actual fixture helpers. All used specification anchors were checked against the official HTML
on 2026-11-17. The current specification also covers newer formats; the lab explicitly pins PyIceberg 0.11.1
and v2 fixtures. A specification feature is not represented as browser-engine support.

Reading questions are lesson-specific, and the expandable comparison connects the rule to the fixture or
model. Governance lessons also link official S3 access-control and object-version deletion documentation
as an example of a separate storage boundary. Those sources do not certify compliance or claim that all
object stores enforce identical policies.

## Media production and verification

Original three-scene illustrations and scripts are generated from this course's content. Flite `slt`
provides explicitly synthetic narration. Captions use per-sentence audio durations; transcript text and cue
text are compared automatically. Scene content stays above the bottom caption-safe region. Every media
asset is committed; normal course builds do not run speech synthesis or require FFmpeg.

Review includes first → changed → following content in the built lesson, all diagram pages at 390/820/1440px
in both themes, resource keyboard disclosures, player playback/seek/caption cues/transcripts, media failure
fallback, menu focus/close paths, saved-note preservation, actual WASM experiments, and visual inspection of
representative diagrams and every recording's scene images. H.264/AAC and VP9/Opus stream presence is checked
with FFprobe; source timings, caption text and MP4 fast-start layout have automated checks. No human voice
performance review, independent pronunciation review or learner-comprehension study is claimed.
