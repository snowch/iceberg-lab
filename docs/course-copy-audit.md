# Course copy and disclosure audit

Reviewed 17 November 2026 against the published baseline `13afc05`.
The sentence ledger and UI snapshots record that audit. A subsequent footer refinement
removed stacked divider lines, grouped optional resources and aligned the review button
at the start of its own row; its saved progress and notes behavior is preserved.

The review covers all 42 lessons sentence by sentence: objectives, scenarios, predictions,
instructions, worked explanations, variations, explanation questions and answer choices.
It also covers lesson support, seven section introductions and review tasks, learning paths,
diagram labels and notes, reference questions, three video scripts, the overview, laboratory
guide and shared interaction copy. Necessary technical terms remain, with explanations near
their first use. Accurate, useful sentences were retained rather than rewritten for novelty.

## The main problem

The previous design split necessary information across overlapping hints and technical panels.
Some sentences mixed automatic preparation with a learner instruction. Others named an internal
implementation detail without helping the learner decide what to do or interpret a result.

The first lesson illustrates both problems:

| Before | After | Why |
| --- | --- | --- |
| “Start with zero batches.” | “An empty shop.orders table is prepared automatically. No orders have been added.” | The page prepares it; this is not an instruction to configure something. |
| “Compare the metadata path with the number of data files.” | “Click Run experiment with the code unchanged. Find metadata, rows and data_files in the output.” | Names the action and the evidence instead of asking for an unexplained comparison between an address and a count. |
| “Change the setup to reset(batches=1).” | Add `append(0)` as the first line in the editor, then run again. | Setup was read-only. The replacement is an edit the learner can actually make. |
| Generic explanations of `metrics`, SQL materialization and pruning | A short explanation of the catalog calls and `files()` under optional code details | The first example does not use SQL or planning metrics. |

## The reading and running path

Each lesson now follows the same sequence:

1. A specific objective and reason to investigate.
2. A prediction question under **Before you run**.
3. **Run the example**: what the page prepares, what the learner should do, and which output to inspect.
4. The editable example, one primary Run button and its printed result.
5. A visible **What the result means** explanation and concept diagram.
6. **Try one change**, with an explicit editor change and rerun/comparison instruction.
7. **Check your understanding**.

The first lesson of each section uses its section introduction instead of repeating a second
scenario. The redundant stage navigation, numbered stage labels, repeated concept callout,
uniform five-minute label and “Real Iceberg” badge were removed from individual lesson pages.
Models remain explicitly described in their introductions, code and explanations.

The idle Stop button, completed-runtime status, four generic metric cards, primary elapsed-time
display and prominent export controls no longer interrupt the lesson. Stop appears during work.
File inspection and exports remain available in the technical section. Runtime timing remains
in exported evidence, where its scope can be explained.

An edited example is no longer given a red failure message simply because it differs from the
original assertions. Its result is identified as edited, and the visible explanation is clearly
labelled as describing the original code. A Python error still has a concise error message and
recovery instruction, with the full traceback available in technical details.

## Which collapsed sections remain, and why?

Essential preparation, instructions, result interpretation and diagrams are visible.

| Disclosure | Decision | Reason |
| --- | --- | --- |
| Need a starting point? / What evidence should I look for? | Removed | These contained the basic directions learners needed before running. Preparation and action are now visible. |
| New to the code? | Merged | Only lesson-relevant code explanations remain in the technical section. |
| Fixture setup & evidence check | Merged and renamed | “Code, files and checks (optional)” identifies the contents; preparation is explicitly automatic. |
| Snapshot history / Inspect warehouse | Merged | File tools and technical evidence share one optional section, with no nested inspection disclosures. |
| Compare with the worked result | Expanded permanently | Interpreting the result is essential to the lesson. |
| Your notes (optional) | Kept | Saving a prediction/reflection is useful but should not add compulsory forms to the main path. Existing saved notes are preserved. |
| References | Kept | Further reading belongs after the lesson, with a clear source question. |
| Reference answer comparison | Kept inside References | The question can be attempted before revealing its answer. This is deliberate, useful nesting. |
| Video recap | Kept on three lessons | Optional alternate explanation, with captions and transcript; no autoplay. |
| Section review checklist | Kept on seven section endings | Learners can attempt the new scenario before revealing the criteria. |

On a fresh first-lesson page, the measured count falls from **five top-level disclosures
(seven including nested ones) to three (four including the reference answer)**. Running the
old page added two further disclosures for history and file inspection; the revised page
keeps those tools within its existing technical section. Extra disclosures on section-ending
or video lessons have the specific purposes listed above; the goal is not an arbitrary count.

## Lesson-by-lesson decisions

Every lesson has new explicit preparation/action copy and a tested suggested edit. The table
records the particular mechanism or wording checked in each lesson; it does not imply that
every retained sentence needed changing.

| Lesson | Particular review decision |
| --- | --- |
| 01 Catalog | Separate the already prepared empty table from the action; identify output fields; replace the inaccessible setup edit. |
| 02 Membership | Explain unfinished work in ordinary language; avoid introducing “metadata graph” and undefined snapshot terminology in the answer. |
| 03 Metadata | Define JSON, schemas, partition specifications and snapshots; distinguish current identifiers from counts of definitions. |
| 04 Manifest list | Define the intermediate file; distinguish the printed manifest-list address from the manifest addresses it contains. |
| 05 Manifest | Explain file descriptions before reading rows; qualify record-count summation to the append-only example. |
| 06 Parquet IDs | Keep the output focused on field identity; remove unrelated row-group/count output; compare table and stored IDs explicitly. |
| 07 Snapshots | Explain that the first snapshot has no parent and later parent IDs link complete states; use JSON null for no parent. |
| 08 Time travel | Name the selected snapshot edit and the count to predict; retain file-retention and reproducibility conditions. |
| 09 Append reuse | Describe reuse through unchanged paths; specify exactly where to insert the second append. |
| 10 Rename | Specify all name replacements; retain the distinction between a schema metadata change and a new data snapshot. |
| 11 Add column | Explain null as missing; give the full alternative SQL string and say to preserve its quotes. |
| 12 Re-add column | Locate the type edit in `add_column`; keep name reuse separate from field identity. |
| 13 Baseline | Explain the actual order of Iceberg scanning and DuckDB filtering; show where to supply an Iceberg predicate. |
| 14 Bounds | Define file ranges; distinguish candidate rows, matching rows and the sum of selected file sizes. |
| 15 Residual | Explain the two decisions—select files, then rows—before naming the residual filter. |
| 16 Identity partition | State that the partitioned table is already prepared; compare a second predicate through the editable code. |
| 17 Partition evolution | Explain that the new rule applies to future writes; identify the old/new spec values and append location. |
| 18 Hidden transforms | Describe this as a Python projection model; define the inclusive start/exclusive end and exact-midnight variation. |
| 19 Small files | Correct “same data” to equal row counts: generated values differ; do not imply an equivalent-answer benchmark. |
| 20 Consolidation | State that full row values are preserved; distinguish current-file reduction from retained historical storage. |
| 21 Delete | Define copy-on-write using the observed replacement file; test a whole-file deletion as the variation. |
| 22 Deleted history | Identify which query uses the saved state; make historical references inspectable with an explicit added line. |
| 23 Expiration | Keep metadata removal separate from physical cleanup; verify the unchanged current count. |
| 24 Orphans | Define why historical-only files are still referenced; retain the in-flight-write and safe-age conditions. |
| 25 Stale commit | Explain the deliberately caught exception; state the local sequential-interleaving scope. |
| 26 Reload | Correct the retry-loop claim: the example reloads before an independent change; the variation deliberately adds a duplicate column. |
| 27 Publication | Keep this an explicitly described pointer model; test the failure of the expected-state comparison. |
| 28 Tags | Define `main` in the visible explanation; print both named references in the variation. |
| 29 Delete strategies | Define both approaches; preserve the byte-model assumptions and omitted costs. |
| 30 Compatibility | Describe imaginary feature declarations; an empty missing-feature list is not proof of real-engine support. |
| 31 Discovery/access | State which permissions the model grants; distinguish calculating permission outcomes from enforcing them. |
| 32 Row policy | Explain that filtering a list changes one result and leaves the full source accessible. |
| 33 Metadata exposure | Identify the information read before rows; explain that encoded bounds require field types to interpret. |
| 34 Audit record | Explain the reproducibility purpose; test the saved report after another append; retain tamper-resistance limits. |
| 35 Erasure | Define what the inventory booleans mean; make the remaining-copy change concrete. |
| 36 Retention | Distinguish age from protection; locate the dictionary edit on the `protected =` assignment line. |
| 37 Workload | Compare predicates on one existing layout; distinguish candidate records from the actual matching count. |
| 38 Ordering | Clarify that layouts are written in turn; explain direct row arrangement versus configuring an Iceberg sort order. |
| 39 Request cost | Describe serial request assumptions; test zero per-request overhead instead of implying measured latency. |
| 40 Correctness | Keep grouped aggregates central; qualify exact floating-point comparison to these generated amounts. |
| 41 Incident | Narrow the objective to what the code does: consolidate files and preserve the grouped report; no partition-repair claim. |
| 42 Recommendation | Connect observations, proposal, risks and a falsifiable next measurement; remove “fixture” from learner-facing output. |

Diagram review also corrected the membership illustration to show the actual three referenced
files, simplified unfamiliar labels, and states that illustrations describe the original example
and do not update after edits. Video language, narration, captions and posters were regenerated
together. References retain official sources and example/version boundaries.

## Review record and verification

- [Original copy snapshot](audit/copy-before.json): authored prose and examples before the audit.
- [Sentence ledger](audit/sentence-ledger.json): each original and resulting sentence/short label, its field,
  purpose and disposition. Replacement links are at field level because a rewrite may split or combine sentences.
- [Per-lesson instruction record](audit/rewrite-notes.json): original variation, revised preparation, action and edit.
- [Expanded UI snapshots](audit/ui-snapshots.json): overview, guide, representative lesson pages and interaction states.
- [Runnable variations](../tests/variations.json): the actual edited code and assertions used to verify all 42 directions.

`node scripts/audit-copy.mjs` regenerates the textual inventory from the original snapshot, current
content and captured UI. It records the editorial review; it is not an automated clarity score.
Sentence segmentation is mechanical and can split code-like identifiers. Shared UI snapshots
repeat lesson text, so inventory totals are not counts of unique course sentences. Refresh the
browser snapshots if shared UI is changed again.

Verification includes all 42 original examples and all 42 variations in the pinned WASM runtime,
including the intentional duplicate-column error; independent reruns, inspection, exports and
error recovery; and browser tests for all lesson routes, notes, keyboard use, navigation, media,
both themes and phone/tablet/desktop widths. The first lesson was also run and visually inspected
at those sizes, including its empty-table output and visible explanation.

These checks establish that the instructions are executable and the reading path works.
They do not establish measured learning effectiveness. A useful next check is to observe a new
learner explaining table membership, pruning and retained history without prompting.
