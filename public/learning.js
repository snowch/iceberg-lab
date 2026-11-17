// Lesson copy separates automatic preparation, learner action, code details and result interpretation.
import {lessons} from './lessons.js';
export const support = {
  "catalog": {
    "concept": "The catalog records which metadata file currently describes a named table. That metadata describes the table’s columns and the files used by its current state.",
    "prepared": "An empty shop.orders table is prepared automatically. No orders have been added.",
    "action": "Click Run experiment with the code unchanged. Find metadata, rows and data_files in the output.",
    "explanation": "catalog.list_tables lists table names. table.metadata_location is the address of the table’s metadata file; it is not an order record. files() lists data files used by the current table.",
    "read": "tables lists shop.orders. metadata is a file address; its generated name can differ on each run. rows and data_files are both 0, so a table definition exists before any order data is written."
  },
  "membership": {
    "concept": "Iceberg decides membership from committed references. Listing a folder answers a different question: which files physically exist?",
    "prepared": "The table already contains 120 orders in three data files. The example will also write a separate file without adding it to the table.",
    "action": "Click Run experiment. Compare before and after, then check extra_exists.",
    "explanation": "table.scan().count() counts rows in the Iceberg table. pq.write_table writes the extra Parquet file to disk; this call does not commit it to the Iceberg table.",
    "read": "before and after count the table’s rows. extra_exists only reports whether the extra file is on disk."
  },
  "metadata": {
    "concept": "Metadata JSON records column definitions, partition rules and saved table states. The current IDs select which of those definitions a reader should use.",
    "prepared": "The table has three completed appends, each adding 40 orders. Its current metadata file is ready to inspect.",
    "action": "Click Run experiment. Read the current identifiers and the number of saved schema and snapshot definitions.",
    "explanation": "json.loads reads the metadata JSON into a Python dictionary. The current-… keys select definitions stored elsewhere in that document.",
    "read": "current-snapshot-id identifies the state to read now. snapshots counts the recorded states; it is not a row count."
  },
  "manifest-list": {
    "concept": "A snapshot points to a manifest list. That list names the manifests containing its file descriptions, so the metadata JSON does not need to list every data file itself.",
    "prepared": "The table has three snapshots, one for each completed append. The example starts from the newest one.",
    "action": "Click Run experiment. Follow the manifest_list path to the manifest paths printed beneath it.",
    "explanation": "A snapshot describes one table state. read_manifest_list opens the Avro file that lists that state’s manifests. Avro is the file format used for these lists.",
    "read": "The first object names the manifest-list file. The following list names the manifests it references. File counts describe entries in those manifests."
  },
  "manifest": {
    "concept": "A manifest describes files and their metrics. A planner can use these descriptions before opening the data itself.",
    "prepared": "The table contains three 40-row data files. Its manifests describe those files.",
    "action": "Click Run experiment. Read each path and rows value, then compare their sum with manifest_records.",
    "explanation": "The two loops visit each manifest and its live file entries. record_count is the number of stored rows described for a data file.",
    "read": "The sum describes 120 stored rows in this example, which has no row-delete files. It is not a general rule for every table with deletes."
  },
  "parquet-ids": {
    "concept": "A field ID identifies a logical column across name changes. Parquet stores that ID with the physical column.",
    "prepared": "The table’s three columns are stored in Parquet files with Iceberg field IDs.",
    "action": "Click Run experiment. Match each printed column name with its id.",
    "explanation": "pq.ParquetFile reads the chosen data file’s metadata. PARQUET:field_id is the annotation that records the Iceberg identity of a stored column.",
    "read": "IDs 1, 2 and 3 identify order_id, region and amount. These IDs connect the table’s column definitions to the columns stored in Parquet."
  },
  "snapshots": {
    "concept": "A snapshot is a complete logical state, assembled from file references. Parent links describe how states relate without copying all the data.",
    "prepared": "Three appends have already added 40 orders each. The example reads the resulting snapshot history.",
    "action": "Click Run experiment. For the second and third entries, find the earlier id named by parent.",
    "explanation": "history() returns snapshot IDs, their parent IDs and the operation that created each state. A parent ID identifies the state that preceded a snapshot.",
    "read": "The first snapshot has no parent. The later parent IDs connect the second snapshot to the first and the third to the second."
  },
  "time-travel": {
    "concept": "Time travel selects the input state before the query runs. The same SQL can therefore answer questions about different table versions.",
    "prepared": "The table has three saved states, containing 40, 80 and 120 orders.",
    "action": "Click Run experiment. Compare n under then with n under now.",
    "explanation": "The second argument to sql selects a snapshot. If that argument is omitted, sql reads the current state. n is the count returned by the query.",
    "read": "then and now run the same SQL on different input states. Their different counts do not mean one query is incorrect."
  },
  "immutable": {
    "concept": "An append adds new data and publishes new metadata. Existing immutable files can be reused in both the old and new states.",
    "prepared": "The table starts with three data files. The code will append 40 more orders and compare file paths.",
    "action": "Click Run experiment. Compare reused, new and rows in the output.",
    "explanation": "before & after finds paths present in both sets. after - before finds paths added by the append.",
    "read": "reused counts unchanged data-file paths; new counts added paths. Neither counts metadata files."
  },
  "rename": {
    "concept": "A rename changes a label while preserving identity. Iceberg resolves stored columns by field ID, so the physical names need not be rewritten.",
    "prepared": "The table has a region column with field ID 2. Its existing files will be read after a rename.",
    "action": "Click Run experiment. Compare old_id, new_id and same_files, then read the grouped query result.",
    "explanation": "rename_column changes the column name in the table schema. The SQL query uses the new name, market, to read data from existing files.",
    "read": "Matching IDs and same_files = true show that this rename changes metadata without rewriting the data files."
  },
  "add-column": {
    "concept": "An optional field can be absent from older files. For this new field, those old rows resolve to null rather than a backfilled business value.",
    "prepared": "The table contains 120 orders written before any priority column existed.",
    "action": "Click Run experiment. Compare rows with populated.",
    "explanation": "COUNT(*) counts all rows. COUNT(priority) counts only rows where priority has a non-null value; null means a value is missing.",
    "read": "rows remains 120 while populated is 0. Adding an optional column does not fill in values for older orders."
  },
  "readd": {
    "concept": "Dropping a field retires its identity. A new field with the same spelling must receive a different ID, or unrelated historical values could be confused.",
    "prepared": "The existing amount column has field ID 3. The code will drop it and add a new column with the same name.",
    "action": "Click Run experiment. Compare old_id with new_id and read populated.",
    "explanation": "delete_column retires a column from the current schema. add_column creates a new field identity, even when its name matches a retired column.",
    "read": "The new amount field has a new ID. populated counts non-null values for that new field, not the retired amount field."
  },
  "baseline": {
    "concept": "The number of returned rows describes the answer. The number of candidate records describes rows stored in the files selected for reading; the two can differ greatly.",
    "prepared": "The table has 120 orders in three files. The first calculation selects all files; the SQL query later returns one matching order.",
    "action": "Click Run experiment. Compare candidate_records with returned.",
    "explanation": "metrics() describes files selected by the Iceberg scan. This lab’s sql helper reads that scan into memory before DuckDB applies its SQL WHERE condition.",
    "read": "returned is an output count. candidate_records counts rows in selected files, so the two values describe different work."
  },
  "bounds": {
    "concept": "File bounds can prove that a file cannot contain a requested value. Iceberg can then skip that file before reading its data.",
    "prepared": "The three files contain order IDs 0–39, 1000–1039 and 2000–2039. The query looks for ID 1005.",
    "action": "Click Run experiment. Compare all with pruned, then read the matching row printed last.",
    "explanation": "metrics passes its condition to Iceberg’s file planner. table.scan(row_filter=…) applies the condition when reading the selected data.",
    "read": "selected_files counts candidate files; candidate_records counts their stored rows. The final row output shows which of those rows actually matched."
  },
  "residual": {
    "concept": "Pruning is conservative: a retained file may match. A residual filter still decides which individual rows actually qualify.",
    "prepared": "Each of the three files contains both EU and US orders. The query selects EU orders.",
    "action": "Click Run experiment. Compare candidate_records under plan with matched_rows.",
    "explanation": "File bounds can rule out a whole file only when it cannot match. The row filter still tests individual rows in any file that remains.",
    "read": "All 120 records are candidates, while 60 rows match. A selected file need not contain only matching rows."
  },
  "identity-partition": {
    "concept": "Identity partitioning groups rows by an unchanged source value. That can reduce work for one predicate while increasing the number of files.",
    "prepared": "The table is already partitioned by region: each of three appends wrote a separate EU file and US file.",
    "action": "Click Run experiment. Compare total_files with selected_files for the EU condition.",
    "explanation": "IdentityTransform keeps the source region value as the partition value. The example prints each file’s partition and stored row count.",
    "read": "There are six files in total, but the EU query selects three containing 60 records. The layout trades more files for fewer candidate records for this query."
  },
  "partition-evolution": {
    "concept": "Partition evolution changes how future files are organized. Every existing file keeps the specification that wrote it.",
    "prepared": "The existing three files are unpartitioned. The code will add region partitioning before writing another group of orders.",
    "action": "Click Run experiment. Compare spec values in the file list, then read the EU scan counts.",
    "explanation": "A partition specification records how files were partitioned. update_spec changes the specification for later writes; it does not rewrite existing files.",
    "read": "Files marked spec 0 are old and unpartitioned. Files marked spec 1 use region partitions. The EU scan still considers all old rows plus new EU rows."
  },
  "hidden-transforms": {
    "concept": "A day transform groups many timestamps under one value. Projecting a timestamp filter onto days gives a coarse candidate set.",
    "prepared": "This Python model uses a time window from 23:30 to 00:30 on the following day. It does not write a partitioned Iceberg table.",
    "action": "Click Run experiment. Read the candidate_days list for that time window.",
    "explanation": "The window includes its start but excludes its end. Subtracting one microsecond from end prevents an exact-midnight endpoint from including the following day.",
    "read": "The days are possible locations for matching rows. The original timestamp condition is still needed to exclude other times in those days."
  },
  "small-files": {
    "concept": "Every commit has fixed work as well as per-row work. Tiny batches multiply files and metadata operations even when the row count is small.",
    "prepared": "The code will create two fresh examples: 12 one-row appends, followed by one 12-row append. An append is one write that adds a group of rows to a table.",
    "action": "Click Run experiment. Compare rows, files and snapshots under tiny and bulk.",
    "explanation": "Each append writes a group of rows and publishes a snapshot. reset creates a new empty table for the second comparison.",
    "read": "Both examples have 12 rows, but their order values differ. The comparison isolates file and commit counts, not equal query answers or production speed."
  },
  "compact": {
    "concept": "Consolidation changes physical layout while preserving logical contents. Historical states may still reference the files it replaces.",
    "prepared": "The table has three data files. The code will read all rows and write them into a new current state.",
    "action": "Click Run experiment. Compare before_files and after_files, then read old_files_still_exist.",
    "explanation": "table.overwrite replaces the current table contents with the rows supplied to it. Sorting the rows before and after lets the check compare their values regardless of output order.",
    "read": "One file is current after the rewrite, but the old files still exist because retained snapshots may need them."
  },
  "delete": {
    "concept": "Copy-on-write replaces data files affected by a row change. Unaffected files can remain referenced without being rewritten.",
    "prepared": "The table has three files. Only one of them contains order 0, which the code will delete.",
    "action": "Click Run experiment. Compare reused_files, new_files and rows.",
    "explanation": "table.delete applies the condition to the current table. This PyIceberg implementation rewrites affected files rather than writing row-delete files.",
    "read": "Two paths are reused because their rows are unaffected. A new file holds the surviving rows from the affected file."
  },
  "deleted-history": {
    "concept": "A delete changes the current state. It does not retroactively change an older immutable state that is still retained.",
    "prepared": "The table contains order 0. The code saves the current snapshot ID, then deletes that order from the current table.",
    "action": "Click Run experiment. Compare the n count under current with the n count under historical.",
    "explanation": "The historical SQL call supplies the saved snapshot ID. It therefore reads the earlier state rather than the state produced by the delete.",
    "read": "The current count is 0 and the historical count is 1. Retaining an older state can retain access to a logically deleted row."
  },
  "expire": {
    "concept": "Expiration removes eligible history from the current metadata. Physical cleanup has its own implementation and reference-safety requirements.",
    "prepared": "The table has three snapshots. The code will remove the oldest snapshot from the retained history.",
    "action": "Click Run experiment. Compare remaining_snapshots with the physical Parquet file counts.",
    "explanation": "expire_snapshots updates the retained snapshot references. In this pinned PyIceberg build, that operation does not physically delete files.",
    "read": "The retained snapshot count falls to 2 while parquet_before and parquet_after stay equal. Files can still be needed by other snapshots."
  },
  "orphans": {
    "concept": "A file missing from the current table can still be needed by an older saved state. Cleanup must check all retained references before treating that file as unused.",
    "prepared": "The code will rewrite the table, leaving a new current file and older files used by retained snapshots.",
    "action": "Click Run experiment. Compare current_files, retained_files and historical_only.",
    "explanation": "retained_paths combines file paths from every retained snapshot. Removing current_paths from that set identifies files used only by older states.",
    "read": "historical_only is 3. Those files are still referenced, so their absence from the current state is not enough to justify deleting them."
  },
  "stale-commit": {
    "concept": "Optimistic commits validate assumptions at publication time. Two writers starting from one schema cannot both assume it is still current after one succeeds.",
    "prepared": "Two table objects will load the same starting schema. The code prepares both schema changes before committing either one.",
    "action": "Click Run experiment. Read the printed CommitFailedException and the final columns list.",
    "explanation": "Writer A commits first. Writer B’s prepared change still requires the old schema, so the catalog rejects it. The try/except block prints that expected failure and lets the example continue.",
    "read": "second_rejected is true and only note_a is added. This demonstrates a stale requirement using the local SQLite catalog, not a distributed timing test."
  },
  "retry": {
    "concept": "A sound retry reapplies intent to fresh state. It preserves compatible changes instead of overwriting another writer’s work.",
    "prepared": "Writer A will add note. Writer B will reload the table before adding the independent source column.",
    "action": "Click Run experiment. Find note and source in the final list and compare their IDs.",
    "explanation": "catalog.load_table reloads the catalog’s current metadata. The second writer creates its change from that new state rather than the earlier schema.",
    "read": "Both columns survive with different IDs. A real retry must also check that the intended change still makes sense after another writer’s update."
  },
  "atomic-pointer": {
    "concept": "Writing files prepares a change. Publishing metadata makes that change visible to readers. Until publication succeeds, readers keep using the earlier complete state.",
    "prepared": "This model starts with a pointer to metadata-v1. A second metadata state and file-b are prepared but not yet published.",
    "action": "Click Run experiment. Compare before_publish and after_publish with written_files.",
    "explanation": "The if condition represents checking an expected starting pointer before publishing a replacement. It models the publication rule rather than implementing a remote catalog.",
    "read": "written_files lists physical files. before_publish and after_publish list files visible through the chosen metadata state."
  },
  "tags": {
    "concept": "A tag gives a stable name to a snapshot. Main may advance while that reference continues to select an earlier state.",
    "prepared": "The table’s current snapshot contains 120 orders. The code will tag that state before adding another 40 orders.",
    "action": "Click Run experiment. Compare tag_snapshot with current_snapshot and read pinned_rows.",
    "explanation": "create_tag gives a snapshot a name. The normal current reference, main, advances after the append, while the report-close tag stays on the named state.",
    "read": "Different snapshot IDs show that main has advanced. pinned_rows is still 120 because the tag continues to select the earlier state."
  },
  "delete-tradeoff": {
    "concept": "Copy-on-write rewrites affected data files when the change is made. Merge-on-read records deletes separately and leaves readers to apply them; that can shift work from writes to later reads.",
    "prepared": "This model compares rewriting one large data file with writing a much smaller set of delete records. It assumes 20 later reads.",
    "action": "Click Run experiment. Compare the immediate write quantities with the extra delete-read quantity.",
    "explanation": "Copy-on-write replaces affected data files. Merge-on-read records deletions that readers must later apply. The multiplication estimates repeated reads of that delete information.",
    "read": "The smaller immediate write does not establish a faster system. The model omits CPU work, caching and later rewrites."
  },
  "compatibility": {
    "concept": "A format specification defines possibilities. Each engine implements a subset that must cover the actual features your table uses.",
    "prepared": "This model declares the features required by one table and the capabilities of two imaginary readers.",
    "action": "Click Run experiment. Read the missing-feature list for each reader.",
    "explanation": "required - capabilities finds requirements absent from a reader’s declared feature set. The reader names do not identify real products.",
    "read": "An empty list means no declared requirement is missing in this model. It is not proof that a real engine can read every table correctly."
  },
  "discovery-access": {
    "concept": "Discovery and access are separate permissions. A user who knows a path may bypass catalog discovery if storage access is still allowed.",
    "prepared": "This permission model denies catalog listing but allows reads from a known storage path.",
    "action": "Click Run experiment. Compare can_discover with can_read_known_path.",
    "explanation": "The two booleans represent independent checks. The code calculates their outcomes; it does not enforce permissions on a real storage service.",
    "read": "A user can fail the discovery check and still pass the direct-file check. Storage credentials therefore need their own access controls."
  },
  "row-policy": {
    "concept": "A filter can demonstrate an intended policy result. Enforcement additionally requires a trusted path that users cannot bypass.",
    "prepared": "The table contains 60 EU orders and 60 US orders. The code will filter a list for the EU analyst while retaining the unfiltered source.",
    "action": "Click Run experiment. Compare governed_rows with direct_source_rows.",
    "explanation": "The list comprehension selects EU rows for one result. It does not change the source table or prevent another reader from accessing it.",
    "read": "A 60-row filtered result can coexist with access to all 120 source rows. This is a policy illustration, not trusted row-level enforcement."
  },
  "metadata-leak": {
    "concept": "Metadata is data about data. Paths, names, counts and bounds may reveal information even without access to result rows.",
    "prepared": "The example will inspect the table schema and one manifest entry without reading the stored order rows.",
    "action": "Click Run experiment. Identify the column names, file path, record count and presence of lower bounds.",
    "explanation": "lower_bounds is a set of file-level statistics keyed by field ID. These values are metadata about stored rows, not the rows themselves.",
    "read": "The output reveals information useful to a query planner and potentially sensitive to a data owner. Metadata needs an access policy too."
  },
  "audit": {
    "concept": "To reproduce a report, record the query and the exact table state it read. A table name can continue to name the same table after its contents have changed.",
    "prepared": "The example will run a grouped report against one snapshot and record which inputs it used.",
    "action": "Click Run experiment. Find the query, snapshot_id, schema_id, software version and result in the printed record.",
    "explanation": "sql(query, snapshot) selects the recorded input state before running the report. The dictionary keeps that state’s identity beside the query and answer.",
    "read": "The record helps reproduce the report, but it does not preserve the files or make the record tamper-resistant."
  },
  "erasure": {
    "concept": "Erasure is a process across in-scope copies. Logical deletion from one state leaves other locations to examine and handle.",
    "prepared": "This inventory model marks the current-table copy as removed and four other locations as still containing the data.",
    "action": "Click Run experiment. Read remaining_locations and complete.",
    "explanation": "True means that the named location still contains the personal data in this scenario. The list collects the locations that still need to be addressed.",
    "read": "complete is false because the inventory still contains retained_snapshot, object_version, export and backup. This is an example inventory, not a compliance assessment."
  },
  "retention-policy": {
    "concept": "Retention combines age with protected references and organizational obligations. A cutoff alone cannot decide what may be removed.",
    "prepared": "This policy model has three snapshot ages, a 30-day cutoff and two protected snapshots.",
    "action": "Click Run experiment. Read protected and eligible together.",
    "explanation": "The list includes a snapshot only when it is older than the cutoff and absent from protected. The legal hold is an organizational rule represented by this example.",
    "read": "The two old snapshots are protected; the unprotected snapshot is too young. No snapshot meets both conditions."
  },
  "workload": {
    "concept": "A useful layout serves a workload, not a single query. File statistics can prune data even when the predicate is not the partition key.",
    "prepared": "The table already has separate EU and US files for each of three appends. The code will plan two filters on that same layout.",
    "action": "Click Run experiment. Compare selected_files and candidate_records under region_query and id_query.",
    "explanation": "metrics passes each condition to Iceberg. File bounds can help an order-ID filter even though the table is partitioned by region.",
    "read": "The EU filter selects three files and 60 records. The ID filter keeps both region files from its batch because their ID ranges overlap."
  },
  "sort-layout": {
    "concept": "Ordering nearby values together narrows file ranges. Narrower ranges can make metadata pruning more selective without changing the rows.",
    "prepared": "The code will write the same 120 orders into two layouts in turn. Both layouts have three files.",
    "action": "Click Run experiment. Compare selected_files under interleaved and clustered for order ID 5.",
    "explanation": "rows[offset::3] spreads nearby IDs across files. Sorting by order_id and writing groups of 40 instead keeps nearby IDs together.",
    "read": "Different file ranges explain the different candidate file counts. The rows and file counts are held constant; no primary-key index is created."
  },
  "cost-budget": {
    "concept": "A cost model makes assumptions explicit so you can challenge them. Request count and bytes are different cost drivers.",
    "prepared": "This model holds the byte count and transfer rate fixed, and assumes requests happen one after another.",
    "action": "Click Run experiment. Compare the estimated times for 3, 30 and 300 files.",
    "explanation": "Each estimate adds a per-file request delay to a byte-transfer time. The values are assumptions in milliseconds, not measurements of this browser or a cloud service.",
    "read": "More files increase the request term. Real clients can overlap requests and cache data, so this simple serial model is only a starting point."
  },
  "benchmark": {
    "concept": "Optimization must preserve the answer. Equal counts alone can hide changed values, so compare the business aggregates too.",
    "prepared": "The code will record a grouped report, rewrite the table and repeat the same report.",
    "action": "Click Run experiment. Read same_answer, the grouped answer and the two file-selection summaries.",
    "explanation": "The comparison checks counts and sums for each region, rather than row count alone. metrics separately describes the selected files.",
    "read": "same_answer is true while the selected file count falls. This verifies the chosen aggregates; it does not prove production throughput improved."
  },
  "incident": {
    "concept": "An incident repair needs a correctness argument as well as a performance argument. Reducing current fragmentation leaves retention work to consider.",
    "prepared": "The table starts with 12 data files, each from a separate append of 40 orders. The code will consolidate them.",
    "action": "Click Run experiment. Compare selected_files under before and after, then read same_answer.",
    "explanation": "The two SQL calls compute the same grouped counts and totals around a full-table overwrite. The file count and answer comparison answer different questions.",
    "read": "The current file count falls from 12 to 1 while the grouped answer is unchanged. Old files remain available to retained history."
  },
  "recommendation": {
    "concept": "A recommendation joins evidence to a conditional decision. State the scope of observation and the next measurement that could overturn your conclusion.",
    "prepared": "The example will assemble a recommendation record for an EU-region dashboard using the local table’s results.",
    "action": "Click Run experiment. Read the observed result and plan before judging the proposed decision.",
    "explanation": "The record keeps an observation, a proposed action, risks and a next measurement together. Its decision text is a proposal, not a measured conclusion.",
    "read": "The local example supports statements about selected files and returned rows. It cannot establish production speed or trusted access enforcement."
  }
};
export const sectionReviews = [
['Trace an unfamiliar table','A job leaves 20 new files in a directory, but readers see no new rows. Explain the lookup path you would inspect before retrying the job.',['Name the catalog pointer, metadata, snapshot, manifest list and manifests.','Distinguish a physical file from a committed member.','Say what evidence would establish a successful commit.']],
['Explain a schema incident','A column was dropped and re-added with the same name. A report now sees nulls. Explain why a rename would have behaved differently.',['Use field IDs, not just names.','Explain the missing-field result for older files.','Identify a retained state that could help investigate.']],
['Choose a pruning experiment','A new partition spec is deployed, but old queries remain expensive. Propose a comparison that distinguishes old-layout work from new-layout work.',['Account for each file’s own specification.','Compare candidate records with matching rows.','Use the same query and check its answer before comparing layouts.']],
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
    'This section follows snapshots and field IDs: the mechanisms that let Iceberg retain earlier states, reuse files and preserve column identity. The first example reads the snapshot history so you can see which states exist before querying an earlier one.'
  ]},
  {title:'Why measure what gets read?', paragraphs:[
    'A query can return one row after considering millions. A small result alone therefore cannot tell you whether a layout is efficient.',
    'This section connects query conditions to the files Iceberg selects. The first example counts files and rows before applying an optimization. Later examples use bounds and partitioning to reduce that work.'
  ]},
  {title:'Why does a correct table need maintenance?', paragraphs:[
    'A pipeline can produce correct answers while accumulating tiny files and retained history. Queries may do more work, and storage may keep growing even after rows are deleted.',
    'This section separates the files used by the current table from files still needed by older states. The first example compares small and large writes to show how ingestion choices create later maintenance work.'
  ]},
  {title:'Why study failed commits?', paragraphs:[
    'A production table often has more than one writer. Two jobs may each prepare a valid change using the same starting state, but the first successful commit can invalidate the second job’s assumptions.',
    'This section examines publication, validation of conflicting changes and retries. The first example deliberately prepares two schema changes from the same starting state, then shows why the second commit is rejected.'
  ]},
  {title:'Why look beyond the query interface?', paragraphs:[
    'A table may be hidden in a catalog yet readable through a storage path. A deleted row may disappear from today’s report while remaining in a retained snapshot or export.',
    'This section examines those separate access and retention paths. The first example distinguishes discovering a table name from reading a known file path, because those permissions can be enforced in different places.'
  ]},
  {title:'Why does a design need an evidence trail?', paragraphs:[
    'A layout that helps one dashboard may create more files or do little for another query. A convincing design must balance the workload, write costs, correctness, retention and access requirements.',
    'This section brings those tradeoffs together. Its examples compare query conditions, layouts and correctness checks before the final recommendation. The recommendation must distinguish local observations from claims that still need production testing.'
  ]}
];
