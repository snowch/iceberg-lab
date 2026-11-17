// Every lesson is independently executable; setup is visible in the UI.
export const parts = [
  ['01', 'Find the table', 'Follow the metadata to real files.'],
  ['02', 'Change without losing identity', 'Snapshots, history and schema evolution.'],
  ['03', 'Read less', 'Choose layouts and inspect pruning.'],
  ['04', 'Maintain the warehouse', 'Small files, deletes and retained history.'],
  ['05', 'Commit safely', 'Concurrency, references and compatibility.'],
  ['06', 'Govern the whole path', 'Access, audit and deletion boundaries.'],
  ['07', 'Design with evidence', 'Workload tradeoffs and a final investigation.']
];
function lesson(id, part, title, goal, story, predict, code, check, worked, change, question, choices, answer=0, options={}) {
  return {id,part,title,goal,story,predict,code,check,worked,change,question,choices,answer,
    setup:options.setup || 'reset()',kind:options.kind || 'Real Iceberg', minutes:options.minutes || 5};
}
export const lessons = [
lesson('catalog',0,'Find the catalog pointer',
'Resolve a table name to its current metadata file.',
'A dashboard asks for shop.orders. The catalog resolves that name to metadata; it does not hold the order rows.',
'Will creating a table create a data file?',
`show(catalog.list_tables('shop'))
show({'metadata': table.metadata_location,
      'rows': table.scan().count(),
      'data_files': len(files())})`,
`assert table.scan().count() == 0
assert len(files()) == 0
assert Path(table.metadata_location.replace('file://','')).exists()`,
'The name resolves to a metadata JSON file. The empty table has a schema and a location but no data files or snapshots. Catalog state and data state are different layers.',
'Change the setup to reset(batches=1). Find what appears after the first append.',
'What does the catalog resolve?', ['A table name to its metadata location','A row ID to a byte offset','A SQL query to its final answer'],0,{setup:'reset(batches=0)'}),
lesson('membership',0,'A directory is not a table',
'Distinguish physical files from committed table membership.',
'A failed job leaves an extra Parquet file beside the table. A directory scan could accidentally include it.',
'Will the extra file change an Iceberg count?',
`before = table.scan().count()
extra = Path(table.location().replace('file://','')) / 'data' / 'uncommitted.parquet'
pq.write_table(pa.table({'order_id':[99999]}), extra)
after = table.scan().count()
show({'before':before, 'after':after, 'extra_exists':extra.exists()})`,
`assert before == after == 120
assert extra.exists()`,
'The count stays at 120. Iceberg reads the files referenced by the snapshot, so the uncommitted file is invisible. Its presence alone does not prove it is safe to delete in a live system.',
'Give the extra file ten rows. Does the count change?',
'What establishes membership?', ['The committed metadata graph','A .parquet suffix','The newest directory timestamp'] ),
lesson('metadata',0,'Read the metadata JSON',
'Locate the current snapshot, schema and partition specification.',
'You need to explain what changed without opening a single data file.',
'Are schemas and snapshots stored in the same metadata document?',
`metadata_path = Path(table.metadata_location.replace('file://',''))
metadata = json.loads(metadata_path.read_text())
show({key:metadata[key] for key in ['format-version','current-snapshot-id','current-schema-id','default-spec-id']})
show({'schemas':len(metadata['schemas']), 'snapshots':len(metadata['snapshots'])})`,
`assert metadata['format-version'] == 2
assert len(metadata['snapshots']) == 3`,
'The metadata document records the current identifiers and historical definitions. The catalog pointer chooses this metadata version; the directory may contain older versions too.',
'Print the snapshot-log and compare its entries with the snapshots array.',
'Why can there be several metadata JSON files?', ['Each commit can write a new immutable metadata version','Each region must have one','Each JSON file contains a different data row'] ),
lesson('manifest-list',0,'Open a manifest list',
'Follow one snapshot to its manifest files.',
'The current snapshot points to an Avro manifest list. It summarizes manifests so a planner can avoid unnecessary work.',
'Will the list contain order rows or references to manifests?',
`snapshot = table.current_snapshot()
manifest_list = list(read_manifest_list(table.io.new_input(snapshot.manifest_list)))
show({'snapshot':str(snapshot.snapshot_id),'manifest_list':snapshot.manifest_list})
show([{'path':m.manifest_path,'spec_id':m.partition_spec_id,
       'added_files':m.added_files_count,'existing_files':m.existing_files_count}
      for m in manifest_list])`,
`assert len(manifest_list) > 0
assert all(m.manifest_path.endswith('.avro') for m in manifest_list)`,
'The list contains manifest references, not order rows. File counts describe entries in each manifest; an existing manifest can be reused by a later snapshot.',
'Inspect the first snapshot’s list using table.metadata.snapshots[0].',
'What does a manifest list reference?', ['Manifest files','Individual SQL operators','Only Parquet row groups'] ),
lesson('manifest',0,'Read file entries',
'Find data-file paths and record counts in a manifest.',
'Before a planner opens Parquet, Iceberg already knows a file’s size, record count and statistics.',
'Can you account for all 120 rows from live file entries?',
`entries = []
for manifest in table.current_snapshot().manifests(table.io):
    for entry in manifest.fetch_manifest_entry(table.io):
        entries.append({'path':entry.data_file.file_path,
                        'rows':entry.data_file.record_count,
                        'bytes':entry.data_file.file_size_in_bytes})
show(entries)
show({'manifest_records':sum(e['rows'] for e in entries)})`,
`assert sum(e['rows'] for e in entries) == 120
assert len(entries) == 3`,
'Three append files contribute 40 rows each. These are live entries in this append-only fixture. With row-level deletes, summing record counts alone does not necessarily give the visible row count.',
'Print entry.status and entry.snapshot_id alongside each path.',
'Where can file-level statistics be available?', ['In manifest entries before opening Parquet','Only in SQL output','Only in the catalog name'] ),
lesson('parquet-ids',0,'Find identity in Parquet',
'Inspect field IDs embedded in an actual data file.',
'A column name may change while its stored bytes stay where they are. Readers need stable identity.',
'Will the Parquet schema carry Iceberg field IDs?',
`path = files()[0].file.file_path.replace('file://','')
parquet = pq.ParquetFile(path)
fields = [{'name':f.name,'id':(f.metadata or {}).get(b'PARQUET:field_id',b'').decode()}
          for f in parquet.schema_arrow]
show(fields)
show({'rows':parquet.metadata.num_rows,'row_groups':parquet.metadata.num_row_groups})`,
`assert [f['id'] for f in fields] == ['1','2','3']`,
'The Parquet columns carry IDs 1, 2 and 3. Iceberg uses field identity when resolving evolved schemas. A plain Parquet reader looking only at names does not perform that table-level resolution.',
'Compare those IDs with table.schema().fields.',
'What survives a supported rename?', ['The field ID','The old SQL spelling must remain current','A new data file is required'] ),
lesson('snapshots',1,'Trace snapshot ancestry',
'Follow the parent links created by successive appends.',
'Three ingest batches have committed. You need to explain which state each commit produced.',
'Will each append create a snapshot with a new parent link?',
`chain = history()
show(chain)
show({'visible_rows':table.scan().count()})`,
`assert len(chain) == 3
assert chain[1]['parent'] == chain[0]['id']
assert chain[2]['parent'] == chain[1]['id']`,
'The three snapshots form a parent chain. A snapshot describes a complete table state using referenced files; it is not just a standalone batch of new rows.',
'Append batch 3, then print the new chain.',
'What does a snapshot represent?', ['A table state','Only rows newly inserted by that commit','A copy of every data file'] ),
lesson('time-travel',1,'Read an earlier snapshot',
'Query two states of the same table.',
'A report from yesterday needs to be reproduced after more data arrives.',
'How many rows are visible in the first snapshot?',
`first = table.metadata.snapshots[0].snapshot_id
then = sql('SELECT count(*) AS n, sum(amount) AS total FROM orders', first)
now = sql('SELECT count(*) AS n, sum(amount) AS total FROM orders')
show({'first_snapshot':str(first),'then':then,'now':now})`,
`assert then[0]['n'] == 40
assert now[0]['n'] == 120`,
'The first snapshot has 40 rows; the current one has 120. The ID selects the state before SQL runs. Reproducibility also requires retaining its files and knowing the query and software versions.',
'Read the second snapshot instead. Predict its count before running.',
'What must remain available for time travel?', ['The retained snapshot and its referenced files','Only a snapshot ID written in a notebook','Only the newest metadata file'] ),
lesson('immutable',1,'Watch an append reuse files',
'Prove that an append preserves existing data files.',
'You want to distinguish logical table growth from rewriting all existing data.',
'Will an append replace the paths of the original three files?',
`before = {f.file.file_path for f in files()}
append(3)
after = {f.file.file_path for f in files()}
show({'reused':len(before & after),'new':len(after-before),'rows':table.scan().count()})`,
`assert before <= after
assert len(after-before) == 1
assert table.scan().count() == 160`,
'All three old files remain referenced and one file is added. New metadata and manifests describe the new state without copying the older Parquet files.',
'Append another distinct batch and compare the sets again.',
'Which cost is intrinsic to this append?', ['Writing new data and committing new metadata','Rewriting every old row','Deleting all old snapshots'] ),
lesson('rename',1,'Rename without rewriting',
'Use field identity to read old files under a new name.',
'The business calls region “market”. Existing data must still be readable.',
'Will file paths or the region field ID change?',
`before = {f.file.file_path for f in files()}
old_id = table.schema().find_field('region').field_id
with table.update_schema() as update:
    update.rename_column('region','market')
new_id = table.schema().find_field('market').field_id
show({'old_id':old_id,'new_id':new_id,'same_files':before == {f.file.file_path for f in files()}})
show(sql('SELECT market, count(*) AS n FROM orders GROUP BY market ORDER BY market'))`,
`assert old_id == new_id == 2
assert before == {f.file.file_path for f in files()}
assert table.scan().count() == 120`,
'The field remains ID 2, the existing files are reused, and current queries use market. Schema evolution commits metadata but does not itself create a new data snapshot.',
'Inspect a Parquet schema after the rename. Its stored name is still region.',
'Why does the renamed column still read correctly?', ['Iceberg maps the stable field ID','It rewrites every Parquet footer','It guesses names from column order'] ),
lesson('add-column',1,'Add an optional column',
'Observe nulls for data written before a field existed.',
'A priority flag is added to a table whose historical files never stored it.',
'What will the 120 existing rows contain for priority?',
`with table.update_schema() as update:
    update.add_column('priority',StringType())
result = sql('SELECT count(*) AS rows, count(priority) AS populated FROM orders')
show(result)
show([{'name':f.name,'id':f.field_id} for f in table.schema().fields])`,
`assert result[0]['rows'] == 120
assert result[0]['populated'] == 0`,
'The new optional field reads as null for old rows in this fixture. Adding a column does not backfill business values into previously written data.',
'Change the query to count rows WHERE priority IS NULL.',
'What does adding this optional field do to old files?', ['Leaves them in place and resolves the missing field as null','Writes a priority value into every file','Drops their rows'] ),
lesson('readd',1,'A reused name is a new field',
'Distinguish a dropped field from a new field with the same name.',
'A developer drops amount and later adds another amount. The spelling matches, but the identity must not.',
'Will the replacement expose historical amount values?',
`old_id = table.schema().find_field('amount').field_id
with table.update_schema() as update:
    update.delete_column('amount')
with table.update_schema() as update:
    update.add_column('amount',DoubleType())
new_id = table.schema().find_field('amount').field_id
result = sql('SELECT count(amount) AS populated FROM orders')
show({'old_id':old_id,'new_id':new_id,'result':result})`,
`assert new_id > old_id
assert result[0]['populated'] == 0`,
'The replacement receives a new field ID and old rows read null for it. Reusing a name does not resurrect the old field’s values.',
'Inspect the Parquet field ID for amount and compare it with the current schema.',
'Is the replacement amount the old field?', ['No; its field ID is different','Yes; names establish identity','Yes; because its numeric type matches'] ),
lesson('baseline',2,'Measure the candidate scan',
'Establish file and record counts before optimizing.',
'A filtered query returns little data, but that does not tell you how much data was considered.',
'How many candidate records exist in the unfiltered scan?',
`baseline = metrics()
show(baseline)
show(sql('SELECT count(*) AS returned FROM orders WHERE order_id = 0'))`,
`assert baseline['selected_files'] == 3
assert baseline['candidate_records'] == 120`,
'The baseline contains three files and 120 candidate records. The SQL helper materializes the Iceberg scan before SQL filtering, so this SQL predicate does not demonstrate Iceberg pushdown.',
'Compare metrics("order_id = 0") with the baseline to ask Iceberg to plan a filtered scan.',
'Can one returned row prove only one row was scanned?', ['No; output cardinality and scan work differ','Yes, always','Only when the result has one column'] ),
lesson('bounds',2,'Skip files with bounds',
'Pass a predicate to Iceberg and inspect file pruning.',
'Order IDs arrive in disjoint ranges. A point lookup should eliminate unrelated files.',
'Which of the three files can contain order_id 1005?',
`all_files = metrics()
pruned = metrics('order_id = 1005')
show({'all':all_files,'pruned':pruned})
show(table.scan(row_filter='order_id = 1005').to_arrow())`,
`assert pruned['selected_files'] == 1
assert pruned['candidate_records'] == 40
assert table.scan(row_filter='order_id = 1005').count() == 1`,
'The planner selects one 40-row file using bounds, then evaluates the row filter. The candidate count is larger than the one matching row. Selected file bytes are a size sum, not measured network traffic.',
'Use order_id = 999999. Predict how many files survive.',
'What does a bound prove?', ['A file can be ruled out when its range cannot match','Every value inside the range exists','A matching file contains only matching rows'] ),
lesson('residual',2,'Separate pruning from filtering',
'Identify why a kept file still needs a row filter.',
'A region filter matches half the orders, but every unpartitioned file contains both regions.',
'Can file bounds remove any whole file for region = EU?',
`planned = metrics("region = 'EU'")
matched = table.scan(row_filter="region = 'EU'").count()
show({'plan':planned,'matched_rows':matched})`,
`assert planned['selected_files'] == 3
assert planned['candidate_records'] == 120
assert matched == 60`,
'All files survive, but only 60 rows match. Keeping a file means it may match, not that every row matches. The residual predicate must still be evaluated.',
'Compare region = US and region = APAC.',
'Why are all three files kept for EU?', ['Each file may contain EU rows','The filter is ignored','Iceberg cannot ever filter strings'] ),
lesson('identity-partition',2,'Partition for one predicate',
'Observe file pruning on a real identity-partitioned table.',
'Queries frequently select one region. You write each batch into identity partitions.',
'Will partitioning reduce candidate records for region = EU?',
`planned = metrics("region = 'EU'")
show(planned)
show([{'spec_id':f.file.spec_id,'partition':str(f.file.partition),'rows':f.file.record_count}
      for f in files()])`,
`assert planned['total_files'] == 6
assert planned['selected_files'] == 3
assert planned['candidate_records'] == 60`,
'Three batches create six files, one per region per batch. The EU scan keeps three files and 60 candidate rows. Better pruning comes with more files to manage.',
'Compare an order_id predicate on this layout. Does partitioning help every query equally?',
'What is the tradeoff here?', ['Fewer candidate rows for region filters but more files','Every query becomes faster by definition','Partitioning eliminates metadata work'],0,{setup:'reset(partitioned=True)'}),
lesson('partition-evolution',2,'Evolve the specification',
'Read old and new files under different partition specs.',
'The first three batches were unpartitioned. You add a region partition without rewriting their data.',
'Will existing files acquire region partition values?',
`old_paths = {f.file.file_path for f in files()}
with table.update_spec() as update:
    update.add_field('region',IdentityTransform(),'region_part')
append(3)
show([{'spec':f.file.spec_id,'partition':str(f.file.partition)} for f in files()])
show(metrics("region = 'EU'"))`,
`assert old_paths <= {f.file.file_path for f in files()}
assert {f.file.spec_id for f in files()} == {0,1}
assert metrics("region = 'EU'")['candidate_records'] == 140`,
'The original three files retain spec 0. The new two files use spec 1. An EU scan still considers the 120 old rows plus 20 new EU rows; evolution alone does not reorganize old data.',
'Append another batch and compare candidate records with total records.',
'Does changing the spec rewrite historical files?', ['No; old and new specs coexist','Yes; all files move immediately','Only file names change'] ),
lesson('hidden-transforms',2,'Reason about hidden transforms',
'Translate a source predicate into safe partition candidates.',
'A production table partitions timestamps by day. Queries should use timestamps while the planner derives day candidates.',
'How many day partitions overlap a window crossing midnight?',
`from datetime import datetime, timedelta
start = datetime(2026,1,1,23,30)
end = datetime(2026,1,2,0,30)
# A small day-projection model; this does not write a partitioned table.
days = []
cursor = start.date()
while cursor <= (end-timedelta(microseconds=1)).date():
    days.append(cursor.isoformat())
    cursor += timedelta(days=1)
show({'half_open_window':[str(start),str(end)],'candidate_days':days})`,
`assert days == ['2026-01-01','2026-01-02']`,
'Two day partitions may match. Rows outside the time window can still occur in both, so the timestamp predicate remains necessary. This model teaches projection; the pinned browser writer supports identity partitioning, not native day/bucket writes.',
'Set end to exactly midnight. The half-open interval should keep only the first day.',
'Why keep the timestamp predicate?', ['Day projection is coarser than the original time window','Partitions are always corrupt','The query must spell a physical partition column'],0,{kind:'Planning model'}),
lesson('small-files',3,'Count the cost of tiny batches',
'Compare file counts for the same logical data.',
'A stream commits each row separately. The rows are correct, but there is a file and commit for every append.',
'Will 12 one-row appends create fewer files than one 12-row append?',
`reset(batches=0)
for batch in range(12):
    append(batch, rows=1)
tiny = {'files':len(files()),'rows':table.scan().count(),'snapshots':len(history())}
reset(batches=0)
append(0, rows=12)
bulk = {'files':len(files()),'rows':table.scan().count(),'snapshots':len(history())}
show({'tiny':tiny,'bulk':bulk})`,
`assert tiny['rows'] == bulk['rows'] == 12
assert tiny['files'] == 12 and bulk['files'] == 1`,
'Twelve commits create twelve files versus one. These fixtures compare operation overhead at equal row counts, not equivalent row values or production throughput. Both paths also have metadata costs.',
'Try 24 one-row appends. Keep fixtures small enough for the browser.',
'What typically grows with tiny commits?', ['File and metadata overhead','Only the number of table columns','The logical row count must change'] ),
lesson('compact',3,'Rewrite a fragmented table',
'Preserve rows while reducing the number of live files.',
'The table has three small files. A controlled full-table rewrite can consolidate them.',
'Will old physical files disappear when the current snapshot stops using them?',
`before_paths = {f.file.file_path for f in files()}
before_rows = sorted(table.scan().to_arrow().to_pylist(),key=lambda r:r['order_id'])
table.overwrite(table.scan().to_arrow())
after_rows = sorted(table.scan().to_arrow().to_pylist(),key=lambda r:r['order_id'])
show({'before_files':len(before_paths),'after_files':len(files()),
      'old_files_still_exist':all(Path(p.replace('file://','')).exists() for p in before_paths)})`,
`assert before_rows == after_rows
assert len(files()) == 1
assert all(Path(p.replace('file://','')).exists() for p in before_paths)`,
'The full rewrite produces one live file and preserves the rows. Old files remain for history. This is a small-table consolidation experiment using overwrite, not a distributed production compaction procedure.',
'Compare selected_file_bytes before and after the rewrite. File count and compressed bytes need not fall by the same ratio.',
'What did this rewrite reduce immediately?', ['The current snapshot’s live file count','All historical storage','The number of rows'] ),
lesson('delete',3,'Observe a copy-on-write delete',
'Identify which file changes when a row is deleted.',
'One order must be removed. The browser writer implements this operation by rewriting affected data.',
'Will deleting one row require rewriting every file?',
`before = {f.file.file_path for f in files()}
table.delete('order_id = 0')
after = {f.file.file_path for f in files()}
show({'removed_from_current':len(before-after),'new_files':len(after-before),
      'reused_files':len(before & after),'rows':table.scan().count()})`,
`assert table.scan().count() == 119
assert len(before & after) == 2
assert len(after-before) == 1`,
'One affected file is replaced; two others are reused. The original file remains physically present. This is copy-on-write, not a positional or equality delete-file demonstration.',
'Delete order_id >= 2000. Compare whole-file removal with a partial-file rewrite.',
'Why are two files reused?', ['They contain no rows matching this delete','Deletes only affect the newest file','A catalog cannot replace multiple files'] ),
lesson('deleted-history',3,'Find deleted rows in history',
'Demonstrate why a logical delete is not complete erasure.',
'A current query no longer finds a customer’s order. Historical readers may still see it.',
'Will an earlier retained snapshot still contain the deleted order?',
`old = table.current_snapshot().snapshot_id
table.delete('order_id = 0')
current = sql('SELECT count(*) AS n FROM orders WHERE order_id = 0')
historical = sql('SELECT count(*) AS n FROM orders WHERE order_id = 0',old)
show({'current':current,'historical':historical})`,
`assert current[0]['n'] == 0
assert historical[0]['n'] == 1`,
'The current state has zero matches; the retained state has one. An erasure process must account for snapshots, retained files, object versions, replicas, exports and backups according to its requirements.',
'List the old snapshot’s files and check whether they still exist.',
'Does a successful DELETE prove complete erasure?', ['No; retained copies and history must be addressed','Yes; all snapshots are modified in place','Yes; if the latest query returns no rows'] ),
lesson('expire',3,'Expire a snapshot reference',
'Separate loss of time travel from physical file cleanup.',
'You decide that the oldest snapshot no longer needs to be queryable.',
'Will metadata expiration automatically prove all old data files are gone?',
`oldest = table.metadata.snapshots[0].snapshot_id
physical_before = len(list(Path(ROOT).rglob('*.parquet')))
table.maintenance.expire_snapshots().by_id(oldest).commit()
physical_after = len(list(Path(ROOT).rglob('*.parquet')))
show({'remaining_snapshots':len(history()),'parquet_before':physical_before,'parquet_after':physical_after})
show({'expired_id_present':any(s.snapshot_id == oldest for s in table.metadata.snapshots)})`,
`assert len(history()) == 2
assert all(s.snapshot_id != oldest for s in table.metadata.snapshots)
assert physical_before == physical_after`,
'The oldest snapshot leaves current metadata. PyIceberg’s metadata-only expiration in this runtime does not delete its files. Files may also still be referenced by other snapshots, so expiration is not a storage-reclamation count.',
'Inspect current rows after expiration. They remain unchanged.',
'What has this operation established?', ['The expired snapshot is no longer retained by current metadata','Every file it used is now safe to remove','All its rows disappeared from the current table'] ),
lesson('orphans',3,'Check every retained snapshot',
'Avoid calling historical files orphaned just because they are not current.',
'After a rewrite, old data files are absent from the current scan but still needed for time travel.',
'Will current-file membership be enough to identify safe cleanup candidates?',
`table.overwrite(table.scan().to_arrow())
current_paths = {f.file.file_path for f in files()}
retained_paths = set()
for snapshot in table.metadata.snapshots:
    retained_paths.update(f.file.file_path for f in files(snapshot.snapshot_id))
historical_only = retained_paths-current_paths
show({'current_files':len(current_paths),'retained_files':len(retained_paths),
      'historical_only':len(historical_only)})`,
`assert len(historical_only) == 3
assert all(Path(p.replace('file://','')).exists() for p in historical_only)`,
'Three files are historical-only and still referenced. This is an inventory of data files in one local table, not a production orphan-deletion algorithm. Real cleanup must handle metadata files, other references, in-flight writes, path normalization and an age safety window.',
'Inspect the first snapshot count to verify those files are still useful.',
'Which set is unsafe to treat automatically as garbage?', ['All physical files minus current files','Files proven unreferenced after a safe age window','Files belonging to a deliberately deleted temporary export'] ),
lesson('stale-commit',4,'Reject a stale schema commit',
'Observe an optimistic-concurrency failure from the real catalog.',
'Two writers read the same schema. Both try to evolve it independently.',
'Can both schema changes commit against the same starting schema ID?',
`from pyiceberg.exceptions import CommitFailedException
writer_a = catalog.load_table('shop.orders')
writer_b = catalog.load_table('shop.orders')
change_a = writer_a.update_schema().add_column('note_a',StringType())
change_b = writer_b.update_schema().add_column('note_b',StringType())
change_a.commit()
rejected = False
try:
    change_b.commit()
except CommitFailedException as error:
    rejected = True
    print(type(error).__name__, str(error))
table = catalog.load_table('shop.orders')
show({'second_rejected':rejected,'columns':table.schema().column_names})`,
`assert rejected
assert 'note_a' in table.schema().column_names
assert 'note_b' not in table.schema().column_names`,
'The second commit fails because its schema requirement is stale. The SQLite catalog performs the check for this sequential interleaving. This proves a conflict condition, not distributed lock timing or service availability.',
'Swap the commit order and predict which column is present.',
'What should a stale writer do next?', ['Reload and revalidate its intended change','Blindly replace the latest metadata pointer','Delete the other writer’s metadata'] ),
lesson('retry',4,'Rebase a compatible change',
'Reload catalog state before applying another evolution.',
'Another writer has already added a note. Your independent source column still needs to be added.',
'Can reloading preserve the other writer’s change?',
`writer_a = catalog.load_table('shop.orders')
with writer_a.update_schema() as update:
    update.add_column('note',StringType())
# Re-read current state, then apply the independent intended change.
writer_b = catalog.load_table('shop.orders')
with writer_b.update_schema() as update:
    update.add_column('source',StringType())
table = catalog.load_table('shop.orders')
show([{'name':f.name,'id':f.field_id} for f in table.schema().fields])`,
`assert {'note','source'} <= set(table.schema().column_names)
assert len({f.field_id for f in table.schema().fields}) == 5`,
'Both changes survive with distinct IDs. Reloading is necessary but not sufficient for every retry: conflicting business operations may need rejection or recomputation.',
'Try adding source twice and inspect the validation error.',
'When is a retry sound?', ['After checking that the intent remains valid on the new state','Whenever an exception occurs','Only if the previous writer’s change is discarded'] ),
lesson('atomic-pointer',4,'Publish one complete state',
'Model why file creation and table publication are separate steps.',
'A writer can fail after writing data but before publishing its new metadata pointer.',
'What should a reader see before publication?',
`# A publication model, not a second catalog implementation.
catalog_pointer = 'metadata-v1'
states = {'metadata-v1':['file-a']}
written_files = {'file-a','file-b'}
states['metadata-v2'] = ['file-a','file-b']
before = list(states[catalog_pointer])
# Successful atomic compare-and-swap against the expected pointer.
expected = 'metadata-v1'
if catalog_pointer == expected:
    catalog_pointer = 'metadata-v2'
after = list(states[catalog_pointer])
show({'before_publish':before,'after_publish':after,'written_files':sorted(written_files)})`,
`assert before == ['file-a']
assert after == ['file-a','file-b']`,
'Before publication, readers use the old complete state. After publication, they use the new complete state. Writing a file alone does not commit it. Real catalogs implement atomic publication and requirements through their own mechanisms.',
'Change expected to metadata-v0 to model a failed compare-and-swap.',
'What makes an uncommitted new file visible?', ['Publishing a metadata state that references it','Its upload finishing','Its name sorting last'],0,{kind:'Commit model'}),
lesson('tags',4,'Pin a reproducible report',
'Create a real tag referencing a known snapshot.',
'A financial report needs an explicit reference to its input state as ingestion continues.',
'Will appending move a snapshot tag automatically?',
`pinned = table.current_snapshot().snapshot_id
with table.manage_snapshots() as manager:
    manager.create_tag(pinned,'report-close')
append(3)
ref = table.metadata.refs['report-close']
show({'tag_snapshot':str(ref.snapshot_id),
      'current_snapshot':str(table.current_snapshot().snapshot_id),
      'pinned_rows':table.scan(snapshot_id=ref.snapshot_id).count()})`,
`assert ref.snapshot_id == pinned
assert table.current_snapshot().snapshot_id != pinned
assert table.scan(snapshot_id=ref.snapshot_id).count() == 120`,
'The tag remains on its original snapshot while main advances. A tag supports naming a reproducible state; its retention settings and referenced files still matter.',
'List table.metadata.refs and compare main with report-close.',
'What does a tag do here?', ['Names a fixed snapshot','Copies every data file into a new table','Automatically follows the newest append'] ),
lesson('delete-tradeoff',4,'Compare delete strategies',
'Model the read/write tradeoff of copy-on-write and merge-on-read.',
'A workload changes a small fraction of rows in large files. Different engines and table versions support different delete mechanisms.',
'Which strategy shifts more work into subsequent reads?',
`# Illustrative byte model, not a measured delete-file benchmark.
affected_file_bytes = 128 * 1024 * 1024
delete_bytes = 64 * 1024
reads_before_rewrite = 20
costs = {
    'copy_on_write_write_bytes':affected_file_bytes,
    'merge_on_read_delete_write_bytes':delete_bytes,
    'merge_on_read_extra_delete_read_bytes':delete_bytes*reads_before_rewrite
}
show(costs)`,
`assert costs['copy_on_write_write_bytes'] > costs['merge_on_read_delete_write_bytes']
assert costs['merge_on_read_extra_delete_read_bytes'] > 0`,
'The model gives merge-on-read a smaller immediate write but repeated delete-reading work. It omits lookup, CPU, caching and compaction. The runnable writer lessons use copy-on-write; this lesson does not generate delete files.',
'Raise reads_before_rewrite. Explain why bytes alone do not establish a latency winner.',
'Which must be verified before choosing a delete strategy?', ['Writer and reader support plus workload costs','Only the format’s feature list','Only the smallest immediate write'],0,{kind:'Cost model'}),
lesson('compatibility',4,'Check the reader contract',
'Separate table-format features from implementation support.',
'A table is valid Iceberg but a downstream reader cannot handle its delete mechanism.',
'Is format-version support alone enough to establish compatibility?',
`# Explicit illustrative engine capability declarations.
required = {'format-v2','position-deletes'}
readers = {'reader_a':{'format-v2','position-deletes','equality-deletes'},
           'reader_b':{'format-v2'}}
missing = {name:sorted(required-capabilities) for name,capabilities in readers.items()}
show(missing)`,
`assert missing['reader_a'] == []
assert missing['reader_b'] == ['position-deletes']`,
'The second reader lacks a required feature despite supporting v2. Production validation should test actual files and operations across pinned engines, catalogs and storage integrations. These names are illustrative, not vendor claims.',
'Add a required transform and compare the capability sets.',
'What is the strongest compatibility evidence?', ['A representative table read and operation test on pinned versions','A shared product category','A matching file extension'],0,{kind:'Compatibility model'}),
lesson('discovery-access',5,'Discovery is not file access',
'Find an access path that bypasses catalog discovery.',
'An analyst cannot list a table but still has a storage URL and permission to read it.',
'Does hiding a table name prevent a direct file read?',
`# Policy model only. Browser code cannot enforce a trusted security boundary.
permissions = {'list_catalog':False,'read_object':True}
can_discover = permissions['list_catalog']
can_read_known_path = permissions['read_object']
show({'can_discover':can_discover,'can_read_known_path':can_read_known_path})`,
`assert not can_discover and can_read_known_path`,
'Catalog discovery is denied while direct object access is allowed. Production protection must account for storage permissions and credentials as well as catalog and engine policy.',
'Revoke read_object and trace which paths remain available.',
'Where must a direct-file bypass be addressed?', ['At the storage and credential boundary','Only in the navigation menu','Only by renaming the table'],0,{kind:'Governance model'}),
lesson('row-policy',5,'Test a row policy boundary',
'Compare governed output with direct access to the same source.',
'An EU analyst should see EU orders. Filtering a query demonstrates a policy’s intended result, not its enforcement.',
'Will an application-side filter protect the underlying file?',
`# A policy model over real data; not trusted enforcement.
all_rows = table.scan().to_arrow().to_pylist()
governed = [row for row in all_rows if row['region'] == 'EU']
show({'governed_rows':len(governed),'direct_source_rows':len(all_rows)})`,
`assert len(governed) == 60
assert len(all_rows) == 120`,
'The filtered view returns 60 rows; direct source access returns 120. Real row-level policies require a trusted enforcement path and controls on bypass access. The browser is deliberately open to inspection.',
'Apply a column projection and explain why omitting amount from the UI does not revoke access to it.',
'What does the filter establish?', ['The intended subset, not a trusted authorization boundary','That the raw data cannot be read','That every engine enforces the rule'],0,{kind:'Governance model'}),
lesson('metadata-leak',5,'Inspect metadata exposure',
'Locate information revealed before scanning data rows.',
'A user cannot query the data but can download the metadata files.',
'Can metadata reveal schema names and counts?',
`schema_names = table.schema().column_names
manifest = table.current_snapshot().manifests(table.io)[0]
entry = manifest.fetch_manifest_entry(table.io)[0]
show({'schema_names':schema_names,'file_path':entry.data_file.file_path,
      'record_count':entry.data_file.record_count,
      'lower_bounds_present':bool(entry.data_file.lower_bounds)})`,
`assert 'amount' in schema_names
assert entry.data_file.record_count == 40
assert entry.data_file.lower_bounds`,
'Real manifests expose paths, counts and encoded bounds; metadata JSON exposes schema and references. These can reveal business information, so metadata access deserves an explicit policy too.',
'Print upper_bounds and explain why the encoded bytes require the field’s type to interpret.',
'What should a data access review include?', ['Metadata and statistics as well as data files','Only SQL result tables','Only catalog descriptions'] ),
lesson('audit',5,'Make a query reproducible',
'Capture an evidence record for a report.',
'Audit needs to know which data state produced a result, not just when someone clicked Run.',
'Is a table name alone enough to replay the report later?',
`snapshot = table.current_snapshot().snapshot_id
query = 'SELECT region, count(*) AS n FROM orders GROUP BY region ORDER BY region'
result = sql(query, snapshot)
record = {'table':'shop.orders','snapshot_id':str(snapshot),
          'metadata_location':table.metadata_location,'schema_id':table.schema().schema_id,
          'query':query,'result':result,'pyiceberg_version':__import__('pyiceberg').__version__}
show(record)`,
`assert record['snapshot_id'] == str(snapshot)
assert sum(r['n'] for r in record['result']) == 120`,
'The record binds the query to a snapshot, schema, metadata location and library version. It is useful evidence, but this local printout is not a tamper-resistant audit service. Real records also need identity, policy context and appropriate result handling.',
'Append another batch, then replay the recorded snapshot query.',
'What still threatens future replay?', ['Expiring the snapshot or losing its referenced files','Adding newer snapshots by itself','Using an explicit snapshot ID'] ),
lesson('erasure',5,'Trace an erasure obligation',
'Identify remaining copies after a logical delete.',
'A deletion request covers all copies under the organization’s policy, including retained history and exports.',
'Which obligations can a current-table DELETE settle on its own?',
`# Evidence inventory model; no compliance guarantee is implied.
copies = {'current_table':False,'retained_snapshot':True,
          'object_version':True,'export':True,'backup':True}
remaining = [name for name,contains_personal_data in copies.items() if contains_personal_data]
show({'remaining_locations':remaining,'complete':not remaining})`,
`assert 'retained_snapshot' in remaining
assert len(remaining) == 4`,
'Four locations still contain the data in this scenario. Retention policy, legal holds, backup treatment and deletion evidence must be resolved explicitly. Removing a snapshot reference does not prove physical erasure.',
'Mark one copy as removed and check which obligations remain.',
'What is the right completion evidence?', ['Verified treatment of all in-scope copies under the retention policy','A zero count in the latest snapshot alone','A successful DROP COLUMN alone'],0,{kind:'Governance model'}),
lesson('retention-policy',5,'Resolve retention before cleanup',
'Calculate which historical states must be preserved.',
'A storage reduction job proposes expiring old snapshots. A reporting tag and a legal hold protect two of them.',
'Can an age cutoff override a protected reference?',
`# A policy decision model, not the production expiration implementation.
snapshots = [{'id':'s1','age_days':90},{'id':'s2','age_days':40},{'id':'s3','age_days':1}]
protected = {'s1':'legal hold','s2':'report tag'}
cutoff_days = 30
eligible = [s['id'] for s in snapshots if s['age_days'] > cutoff_days and s['id'] not in protected]
show({'protected':protected,'eligible':eligible})`,
`assert eligible == []`,
'No snapshot is eligible in this policy model. Age is only one condition. Production jobs must honor actual catalog references and configured retention semantics; legal holds are organizational controls, not an automatic Iceberg property.',
'Remove the report tag from protected. Explain why file cleanup still needs reference analysis.',
'What must be settled before destructive maintenance?', ['Retention requirements and protected references','Only the oldest timestamp','Only the largest file'],0,{kind:'Governance model'}),
lesson('workload',6,'Choose a layout for two queries',
'Compare competing predicates on the same physical layout.',
'Your workload mixes region reports and order lookups. A layout should be evaluated against both.',
'Does the region layout prune equally well for both predicates?',
`region_query = metrics("region = 'EU'")
id_query = metrics('order_id = 1005')
show({'region_query':region_query,'id_query':id_query})`,
`assert region_query['selected_files'] == 3
assert id_query['selected_files'] == 2`,
'The EU filter keeps three 20-row files. Bounds for order ID 1005 keep both region files from its batch because their ID ranges overlap. Always inspect actual statistics rather than assuming a partition key is the only pruning mechanism.',
'Change the ID to 1006 and compare the result. Then try order_id >= 1000 AND order_id < 1040.',
'What should drive layout evaluation?', ['A representative mix of predicates and measured candidates','One favorite query alone','The largest number of partitions possible'],0,{setup:'reset(partitioned=True)'}),
lesson('sort-layout',6,'Narrow bounds with ordering',
'Compare file ranges for identical rows arranged differently.',
'Two tables contain the same orders. One interleaves low and high IDs across files; the other groups adjacent IDs.',
'Which layout should keep fewer files for order_id = 5?',
`rows = table.scan().to_arrow().to_pylist()
reset(batches=0)
for offset in range(3):
    batch = rows[offset::3]
    table.append(pa.Table.from_pylist(batch,schema=table.schema().as_arrow()))
interleaved = metrics('order_id = 5')
reset(batches=0)
for offset in range(0,120,40):
    batch = sorted(rows,key=lambda r:r['order_id'])[offset:offset+40]
    table.append(pa.Table.from_pylist(batch,schema=table.schema().as_arrow()))
clustered = metrics('order_id = 5')
show({'interleaved':interleaved,'clustered':clustered})`,
`assert interleaved['selected_files'] == 3
assert clustered['selected_files'] == 1
assert table.scan().count() == 120`,
'The interleaved files have overlapping ID ranges; grouping adjacent IDs narrows those ranges. Both contain identical rows and have three files. This lesson arranges writes explicitly; it does not declare or verify an Iceberg sort-order contract.',
'Try a wide range predicate and compare how much of the advantage remains.',
'Why did grouping adjacent IDs help?', ['It made file bounds more selective','It created a primary-key index','It changed the logical result'] ),
lesson('cost-budget',6,'Estimate request overhead',
'Keep a cost model separate from measured browser execution.',
'Even a small amount of data can cost time when it requires many serial requests.',
'What happens if the same bytes are spread over many more files?',
`# Simplified serial-request estimate. Not measured cloud latency.
request_ms = 20
throughput_bytes_per_ms = 100_000
bytes_to_read = 12_000_000
estimates = {str(count):count*request_ms + bytes_to_read/throughput_bytes_per_ms
             for count in [3,30,300]}
show({'estimated_ms_by_file_count':estimates})`,
`assert estimates['300'] > estimates['30'] > estimates['3']`,
'This serial model makes request overhead dominate as file count grows. Real clients overlap requests, cache metadata and read ranges; object storage and engine behavior must be measured. These numbers are assumptions, not WASM measurements.',
'Add a concurrency assumption and explain where dividing by concurrency becomes too optimistic.',
'How should the estimate be reported?', ['With its assumptions and a separate measured result','As a production latency guarantee','As elapsed browser time'],0,{kind:'Cost model'}),
lesson('benchmark',6,'Hold the answer constant',
'Validate correctness before comparing physical work.',
'A rewrite reports fewer files. You must prove that it still answers the business query correctly.',
'Is an equal row count enough to establish equal grouped totals?',
`query = 'SELECT region, count(*) AS n, sum(amount) AS total FROM orders GROUP BY region ORDER BY region'
before = sql(query)
work_before = metrics()
table.overwrite(table.scan().to_arrow())
after = sql(query)
work_after = metrics()
show({'same_answer':before == after,'before':work_before,'after':work_after,'answer':after})`,
`assert before == after
assert work_after['selected_files'] < work_before['selected_files']`,
'The grouped counts and totals match while live file count falls from three to one. Correctness comes first. This fixture has exact integer-valued amounts in float columns; arbitrary floating-point workloads need appropriate comparison tolerances.',
'Add min(order_id) and max(order_id) to strengthen the answer check.',
'Which comparison is valid?', ['Equivalent results, controlled data, and explicitly defined work metrics','The fastest single run regardless of its answer','Different queries on different datasets'] ),
lesson('incident',6,'Repair a fragmented workload',
'Combine a rewrite, selective layout and correctness evidence.',
'Twelve tiny commits feed a region dashboard. Your task is to reduce live files while preserving the table’s rows.',
'How many files would remain after one full rewrite of this unpartitioned table?',
`before = metrics()
answer_before = sql('SELECT region, count(*) AS n, sum(amount) AS total FROM orders GROUP BY region ORDER BY region')
table.overwrite(table.scan().to_arrow())
after = metrics()
answer_after = sql('SELECT region, count(*) AS n, sum(amount) AS total FROM orders GROUP BY region ORDER BY region')
show({'before':before,'after':after,'same_answer':answer_before == answer_after})`,
`assert answer_before == answer_after
assert before['selected_files'] == 12
assert after['selected_files'] == 1`,
'The rewrite consolidates twelve files into one and preserves the grouped answer. The original files remain for retained history. A production recommendation must also budget rewrite resources, ingestion contention and retention.',
'Add identity(region) before the rewrite. Predict two live files and compare EU candidate records. The check expects one file, so explain why your valid experiment changes that target.',
'What remains after this repair?', ['Historical files and maintenance obligations','Proof of production throughput','Automatic organization-wide erasure'],0,{setup:'reset(batches=12)'}),
lesson('recommendation',6,'Write a defensible recommendation',
'Assemble a compact evidence record and state its limits.',
'The final deliverable is an engineering decision someone else can inspect and challenge.',
'Which claims can this small local experiment support?',
`baseline = metrics("region = 'EU'")
answer = sql("SELECT count(*) AS n FROM orders WHERE region = 'EU'")
record = {
    'workload':'EU region dashboard',
    'observed':{'answer':answer,'plan':baseline},
    'decision':'Evaluate region partitioning against the full workload',
    'risks':['more files','rewrite cost','retained history','reader compatibility'],
    'next_measurement':'Representative object-store request and scan traces',
    'limits':'Browser-local fixture; no distributed throughput or trusted policy enforcement'
}
show(record)`,
`assert record['observed']['answer'][0]['n'] == 60
assert record['risks'] and record['limits'] and record['next_measurement']`,
'A defensible recommendation connects an observed workload and result to a conditional decision, risks, and the next measurement. Use Export warehouse to retain the real files from an experiment; save the evidence output separately with your query.',
'Replace the decision with your own, citing the preceding experiments. Include the retention and access controls needed for deployment.',
'Which claim follows directly from these lessons?', ['Measured file selection and table behavior on the pinned local fixture','A guaranteed production speedup','A verified enterprise security boundary'] )
];
