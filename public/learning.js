// Short, optional scaffolds: explain the mechanism, cue the next step, identify the evidence.
import {lessons} from './lessons.js';
const scaffolds = [
['A table name is an address, not a container of rows. The catalog’s pointer tells a reader which metadata version is current.','Start with zero batches. Compare the metadata path with the number of data files.','Look for a metadata file alongside zero rows and zero data files.'],
['Iceberg decides membership from committed references. Listing a folder answers a different question: which files physically exist?','Compare the count immediately before and after writing the extra file.','The physical file exists, but the committed count is unchanged.'],
['Metadata JSON is the table’s map. Identifiers select the current schema, partition spec and snapshot from the definitions recorded there.','Compare current-snapshot-id with the IDs in snapshots.','Distinguish a current identifier from the list of historical definitions.'],
['A manifest list adds a level of indirection: one snapshot can refer to many manifests without listing every data file in its metadata JSON.','Follow snapshot.manifest_list, then inspect manifest_path in its entries.','The Avro entries point to more Avro files, not order rows.'],
['A manifest describes files and their metrics. A planner can use these descriptions before opening the data itself.','Sum record_count for the live entries in this append-only fixture.','Check both the three paths and their combined record count.'],
['A field ID identifies a logical column across name changes. Parquet stores that ID with the physical column.','Inspect field.metadata, not just field.name.','Match each PARQUET:field_id with the table schema.'],
['A snapshot is a complete logical state, assembled from file references. Parent links describe how states relate without copying all the data.','Read the IDs as strings and follow each parent to the previous entry.','Check ancestry separately from the visible row count.'],
['Time travel selects the input state before the query runs. The same SQL can therefore answer questions about different table versions.','Use the first snapshot ID as the second argument to sql.','Compare counts for the first state and the current state.'],
['An append adds new data and publishes new metadata. Existing immutable files can be reused in both the old and new states.','Use set intersection to find reused paths and set difference to find additions.','Do not infer a rewrite just because a new snapshot exists.'],
['A rename changes a label while preserving identity. Iceberg resolves stored columns by field ID, so the physical names need not be rewritten.','Compare old_id and new_id, then compare the file-path sets.','You need both stable identity and successful reads under the new name.'],
['An optional field can be absent from older files. For this new field, those old rows resolve to null rather than a backfilled business value.','COUNT(*) counts rows; COUNT(priority) counts non-null priority values.','Compare the two counts instead of relying on a sample row.'],
['Dropping a field retires its identity. A new field with the same spelling must receive a different ID, or unrelated historical values could be confused.','Compare the IDs before and after, then count non-null replacement values.','A matching name and type do not establish identity.'],
['A result describes what a query returns. A scan plan describes candidate work; these are different quantities.','Compare the baseline candidate count with the single-row SQL result.','The helper materializes Iceberg data before SQL WHERE runs.'],
['Bounds are exclusion evidence. If a value cannot lie within a file’s range, the planner can safely skip that file.','Identify which batch range contains 1005. Then inspect selected_files.','Separate selected files, candidate records and matching rows.'],
['Pruning is conservative: a retained file may match. A residual filter still decides which individual rows actually qualify.','Every file in this fixture contains both EU and US.','Compare candidate_records with matched_rows.'],
['Identity partitioning groups rows by an unchanged source value. That can reduce work for one predicate while increasing the number of files.','There are two region files per batch. Count only the EU files.','Check both file growth and candidate-record reduction.'],
['Partition evolution changes how future files are organized. Every existing file keeps the specification that wrote it.','Separate the three old files from the two new region files.','For EU, add all old candidate rows to only the new EU rows.'],
['A day transform groups many timestamps under one value. Projecting a timestamp filter onto days gives a coarse candidate set.','The end of the interval is exclusive. Consider what changes at exactly midnight.','Candidate days do not remove the need for the timestamp filter.'],
['Every commit has fixed work as well as per-row work. Tiny batches multiply files and metadata operations even when the row count is small.','Compare files and snapshots while keeping the total number of rows equal.','This experiment compares overhead, not identical row values or cloud throughput.'],
['Consolidation changes physical layout while preserving logical contents. Historical states may still reference the files it replaces.','Compare complete sorted row sets, then live files and physical existence.','Fewer current files does not imply less retained storage.'],
['Copy-on-write replaces data files affected by a row change. Unaffected files can remain referenced without being rewritten.','Compare before and after path sets to find reuse and replacement.','Count reused files, new files and visible rows separately.'],
['A delete changes the current state. It does not retroactively change an older immutable state that is still retained.','Save the snapshot ID before deleting, then query both states.','A zero current count and nonzero historical count can both be correct.'],
['Expiration removes eligible history from the current metadata. Physical cleanup has its own implementation and reference-safety requirements.','Count retained snapshots and physical Parquet files independently.','This runtime removes the reference without deleting physical files.'],
['A file absent from the current state can still be essential to a retained historical state. Cleanup needs the whole relevant reference graph.','Union the paths from every retained snapshot before subtracting current paths.','Historical-only is a reference category, not proof of garbage.'],
['Optimistic commits validate assumptions at publication time. Two writers starting from one schema cannot both assume it is still current after one succeeds.','Prepare both changes before committing either of them.','Look for a real CommitFailedException and only the winning column.'],
['A sound retry reapplies intent to fresh state. It preserves compatible changes instead of overwriting another writer’s work.','Reload the table after writer A commits, then add the independent field.','Check that both fields survive with distinct IDs.'],
['Publication separates preparation from visibility. A reader should resolve one complete committed state, even if more files already exist.','Track catalog_pointer rather than written_files.','Compare visibility before and after the pointer changes.'],
['A tag gives a stable name to a snapshot. Main may advance while that reference continues to select an earlier state.','Record the tag’s snapshot ID before appending.','Compare the tag ID, current ID and tagged row count.'],
['Delete strategies distribute work differently across writes and reads. A small immediate write can create repeated work later.','Change the number of subsequent reads while holding the affected data size constant.','The byte calculation is illustrative; it is not a latency benchmark.'],
['A format specification defines possibilities. Each engine implements a subset that must cover the actual features your table uses.','Subtract each reader’s capabilities from the required set.','A missing required feature matters even when the format version matches.'],
['Discovery and access are separate permissions. A user who knows a path may bypass catalog discovery if storage access is still allowed.','Evaluate the known-path permission independently from list_catalog.','Hiding a name does not revoke a storage credential.'],
['A filter can demonstrate an intended policy result. Enforcement additionally requires a trusted path that users cannot bypass.','Compare the governed list with the unfiltered source list.','The difference demonstrates an access path, not a security guarantee.'],
['Metadata is data about data. Paths, names, counts and bounds may reveal information even without access to result rows.','Inspect the manifest entry before calling any row-reading helper.','Identify which information came from metadata rather than data rows.'],
['Reproducibility binds a query to an input state and execution context. A mutable table name alone cannot specify those inputs later.','Record the snapshot, schema, query and library version together.','Retaining a record does not itself retain the referenced files.'],
['Erasure is a process across in-scope copies. Logical deletion from one state leaves other locations to examine and handle.','Read the inventory as separate obligations, not one success flag.','A latest-state query cannot prove the status of a backup or export.'],
['Retention combines age with protected references and organizational obligations. A cutoff alone cannot decide what may be removed.','Check protected before considering a snapshot eligible.','A legal hold is an organizational control, not an automatic Iceberg feature.'],
['A useful layout serves a workload, not a single query. File statistics can prune data even when the predicate is not the partition key.','Compare region and ID predicates on the same table.','Inspect actual selected files instead of predicting solely from directory names.'],
['Ordering nearby values together narrows file ranges. Narrower ranges can make metadata pruning more selective without changing the rows.','Keep identical rows and file counts while changing how IDs are grouped.','Overlapping ranges keep more candidate files for a point lookup.'],
['A cost model makes assumptions explicit so you can challenge them. Request count and bytes are different cost drivers.','Hold bytes constant and vary only file count.','Serial requests are an assumption; real clients may overlap or cache work.'],
['Optimization must preserve the answer. Equal counts alone can hide changed values, so compare the business aggregates too.','Capture the grouped result before rewriting and compare it afterward.','Separate logical equivalence from a reduction in physical work.'],
['An incident repair needs a correctness argument as well as a performance argument. Reducing current fragmentation leaves retention work to consider.','Record grouped totals before changing the layout.','Prove the answer survives and identify what remains unresolved.'],
['A recommendation joins evidence to a conditional decision. State the scope of observation and the next measurement that could overturn your conclusion.','Include risks and a next measurement alongside your observed plan.','Local file-selection evidence cannot guarantee a production speedup.']
];
export const support = Object.fromEntries(lessons.map((l,i)=>[l.id,{concept:scaffolds[i][0],hint:scaffolds[i][1],notice:scaffolds[i][2]}]));
export const sectionReviews = [
['Trace an unfamiliar table','A job leaves 20 new files in a directory, but readers see no new rows. Explain the lookup path you would inspect before retrying the job.',['Name the catalog pointer, metadata, snapshot, manifest list and manifests.','Distinguish a physical file from a committed member.','Say what evidence would establish a successful commit.']],
['Explain a schema incident','A column was dropped and re-added with the same name. A report now sees nulls. Explain why a rename would have behaved differently.',['Use field IDs, not just names.','Explain the missing-field result for older files.','Identify a retained state that could help investigate.']],
['Choose a pruning experiment','A new partition spec is deployed, but old queries remain expensive. Propose a comparison that distinguishes old-layout work from new-layout work.',['Account for each file’s own specification.','Compare candidate records with matching rows.','Keep results and workload constant when comparing layouts.']],
['Review a cleanup proposal','An operator proposes deleting every file absent from the current snapshot. Write the reason to pause and the evidence needed before cleanup.',['Consider every retained snapshot and reference.','Separate metadata expiration from physical deletion.','Include in-flight writes and a safe age window.']],
['Resolve a failed commit','A schema update fails after a second writer commits. Explain when to reload and retry, and when the operation needs a new decision.',['Identify the stale assumption.','Preserve compatible changes from the other writer.','Verify reader support and references before deploying new features.']],
['Challenge an access policy','An analyst cannot discover a table but can read its files. A deleted row also remains in a report export. Propose controls for both paths.',['Separate catalog, engine and storage enforcement.','Include metadata exposure and credential scope.','Account for retained history, exports and deletion evidence.']],
['Defend a design','Recommend a layout and maintenance policy for frequent small writes, region dashboards and occasional point lookups. State what this lab proves and what production testing must still establish.',['Compare at least two predicates and validate answers.','Budget file overhead, rewrites and retained history.','Include compatibility, access controls and a falsifiable next measurement.']]
];
export const paths = [
{title:'Understand the format',desc:'Follow a table from its name to its bytes, then change its schema.',parts:[0,1],start:'catalog',time:'12 lessons'},
{title:'Design for a workload',desc:'Measure pruning, repair fragmentation and defend a layout.',parts:[2,3,6],start:'baseline',time:'18 lessons'},
{title:'Operate with confidence',desc:'Investigate commit conflicts, retained history and access boundaries.',parts:[3,4,5],start:'small-files',time:'18 lessons'}
];

// Motivation belongs at a section's entry, before the first technical objective.
export const sectionOpeners = [
  {title:'Why start here?', paragraphs:[
    'Suppose your sales data lives in Parquet files. A file tells you what is inside it, but a folder listing cannot reliably tell you which files form the current table. What if a writer has uploaded new files but has not finished its change? Which version should a dashboard read?',
    'Apache Iceberg is a table format: it adds metadata that describes table states and the files belonging to them. This lets readers use a complete, published table state while writers prepare changes. To understand the performance, safe updates and governance decisions later in this course, we first need to follow how a query finds that state.',
    'The first step is the catalog, which maps a table name to its current metadata location. We begin with an empty table to make one distinction visible: a table can already have a name, schema (its columns and types) and metadata before it contains any data files.'
  ]},
  {title:'Why learn how tables change?', paragraphs:[
    'Ingestion keeps running while reports need consistent inputs. Column names also change as applications evolve. Rewriting everything for every change would be costly, and confusing old and new columns could silently change a result.',
    'This section follows snapshots and field IDs: the mechanisms that let Iceberg retain earlier states, reuse files and preserve column identity. Start with the snapshot history so you can explain which state a later query is reading.'
  ]},
  {title:'Why measure what gets read?', paragraphs:[
    'A query can return one row after considering millions. A small result alone therefore cannot tell you whether a layout is efficient.',
    'This section connects your predicates to the files Iceberg selects. Establish a baseline first, then investigate how bounds and partitioning reduce candidate work. That distinction will help you evaluate a layout using evidence rather than its directory names.'
  ]},
  {title:'Why does a correct table need maintenance?', paragraphs:[
    'A pipeline can produce correct answers while accumulating tiny files and retained history. Queries may do more work, and storage may keep growing even after rows are deleted.',
    'This section separates the current logical table from its physical and historical files. Begin with tiny batches to see how ingestion choices create the maintenance work you will later need to budget and perform safely.'
  ]},
  {title:'Why study failed commits?', paragraphs:[
    'A production table often has more than one writer. Two jobs may each prepare a valid change using the same starting state, but the first successful commit can invalidate the second job’s assumptions.',
    'This section examines publication, conflict validation and retries. Begin by deliberately causing a stale schema commit to fail, so you can distinguish protection against lost changes from an error that should simply be retried.'
  ]},
  {title:'Why look beyond the query interface?', paragraphs:[
    'A table may be hidden in a catalog yet readable through a storage path. A deleted row may disappear from today’s report while remaining in a retained snapshot or export.',
    'This section traces those separate access and retention paths. Begin with discovery versus file access: understanding that boundary helps you choose where controls must actually be enforced.'
  ]},
  {title:'Why does a design need an evidence trail?', paragraphs:[
    'A layout that helps one dashboard may create more files or do little for another query. A convincing design must balance the workload, write costs, correctness, retention and access requirements.',
    'This section brings those tradeoffs together. Start by comparing two predicates on the same table, then build a recommendation that states what you observed, what it supports and what still needs production measurement.'
  ]}
];
