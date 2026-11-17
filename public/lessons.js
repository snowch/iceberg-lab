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
lesson('catalog',0,'How a query finds its table',
'Find the metadata file that describes an empty table.',
'Imagine a sales dashboard querying shop.orders: orders is the table, and shop groups related tables. Before opening data files, the reader asks the catalog which metadata file describes that table now.',
'What counts do you expect for rows and data_files in an empty table? Will metadata still name a file?',
`show({'tables': ['.'.join(name) for name in catalog.list_tables('shop')]})
show({'metadata': table.metadata_location,
      'rows': table.scan().count(),
      'data_files': len(files())})`,
`assert table.scan().count() == 0
assert len(files()) == 0
assert Path(table.metadata_location.replace('file://','')).exists()`,
'The output lists shop.orders and a metadata file address, while rows and data_files are both 0. The table already has a name and column definitions, even though no order data has been written. The catalog records where that definition is stored.',
'Add `append(0)` as the first line in the editor, then click Run experiment again. This adds 40 orders before the inspection. Which output values change?',
'What does the catalog resolve?', ['A table name to its metadata location','A row ID to a byte offset','A SQL query to its final answer'],0,{setup:'reset(batches=0)'}),
lesson('membership',0,'A directory is not a table',
'Distinguish files on disk from files belonging to the current table.',
'A job writes an extra Parquet file but fails before adding it to the table’s metadata. A reader that scans the directory could accidentally include this unfinished work.',
'Will the extra file change an Iceberg count?',
`before = table.scan().count()
extra = Path(table.location().replace('file://','')) / 'data' / 'uncommitted.parquet'
pq.write_table(pa.table({'order_id':[99999]}), extra)
after = table.scan().count()
show({'before':before, 'after':after, 'extra_exists':extra.exists()})`,
`assert before == after == 120
assert extra.exists()`,
'The count stays at 120. Iceberg follows the current table’s metadata to its data files, so the extra file is not included. Its presence alone does not prove it is safe to delete in a live system.',
'In the editor, replace `[99999]` with `list(range(10))`, then run again. The extra file now has ten rows. Does after change?',
'What establishes membership?', ['The file references in committed table metadata','A .parquet suffix','The newest directory timestamp'] ),
lesson('metadata',0,'Read the metadata JSON',
'Locate the current snapshot, schema and partition specification.',
'To find out which table definition a reader is using, inspect its current metadata JSON file. It records column definitions (schemas), rules for grouping files (partition specifications) and saved table states (snapshots). JSON is a text format for named values and lists.',
'Are schemas and snapshots stored in the same metadata document?',
`metadata_path = Path(table.metadata_location.replace('file://',''))
metadata = json.loads(metadata_path.read_text())
show({key:metadata[key] for key in ['format-version','current-snapshot-id','current-schema-id','default-spec-id']})
show({'schemas':len(metadata['schemas']), 'snapshots':len(metadata['snapshots'])})`,
`assert metadata['format-version'] == 2
assert len(metadata['snapshots']) == 3`,
'The current-… identifiers select definitions within this metadata document. schemas and snapshots count the definitions it records. Other metadata JSON files can remain in the directory after later changes, so the catalog’s current location determines which document to use.',
'Add `show(metadata[\'snapshot-log\'])` at the end of the editor and run again. How many published state changes are listed?',
'Why can there be several metadata JSON files?', ['Each completed change can write a new metadata file','Each region must have one','Each JSON file contains a different data row'] ),
lesson('manifest-list',0,'Open a manifest list',
'Follow one snapshot to its manifest files.',
'A snapshot describes one table state. It points to a manifest list, which lists the manifests needed to find that state’s data files. These lists use the Avro file format.',
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
'Replace `table.current_snapshot()` with `table.metadata.snapshots[0]` in the first line, then run again. Does the earliest state refer to fewer manifests?',
'What does a manifest list reference?', ['Manifest files','Individual SQL operators','Only Parquet row groups'] ),
lesson('manifest',0,'Read file entries',
'Find data-file paths and record counts in a manifest.',
'A manifest is a file containing descriptions of data files. Its paths, row counts and statistics help Iceberg decide which data files a query may need.',
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
'Three append files contribute 40 rows each. These are live entries in this append-only example. With row-level deletes, summing record counts alone does not necessarily give the visible row count.',
'In the entries.append dictionary, replace `\'path\':entry.data_file.file_path,` with `\'path\':entry.data_file.file_path, \'status\':str(entry.status),`. Run again. What status is recorded for each entry?',
'Where can file-level statistics be available?', ['In manifest entries before opening Parquet','Only in SQL output','Only in the catalog name'] ),
lesson('parquet-ids',0,'Find identity in Parquet',
'Inspect field IDs embedded in an actual data file.',
'A column name may change while its stored bytes stay where they are. Readers need stable identity.',
'Will the Parquet schema carry Iceberg field IDs?',
`path = files()[0].file.file_path.replace('file://','')
parquet = pq.ParquetFile(path)
fields = [{'name':f.name,'id':(f.metadata or {}).get(b'PARQUET:field_id',b'').decode()}
          for f in parquet.schema_arrow]
show(fields)`,
`assert [f['id'] for f in fields] == ['1','2','3']`,
'The Parquet columns carry IDs 1, 2 and 3. Iceberg uses field identity when resolving evolved schemas. A plain Parquet reader looking only at names does not perform that table-level resolution.',
'Add `show(str(table.schema()))` at the end of the editor and run again. Do the IDs in the table schema match the stored IDs?',
'What stays the same after a supported rename?', ['The field ID','The name used in new queries','The table’s metadata file address'] ),
lesson('snapshots',1,'Follow the snapshot history',
'Follow the parent links created by successive appends.',
'Three ingest batches have committed. You need to explain which state each commit produced.',
'How do the second and third snapshots identify the states they followed?',
`chain = history()
show(chain)
show({'visible_rows':table.scan().count()})`,
`assert len(chain) == 3
assert chain[1]['parent'] == chain[0]['id']
assert chain[2]['parent'] == chain[1]['id']`,
'The first snapshot has no parent. The second names the first as its parent, and the third names the second. Each snapshot describes a complete table state through file references; the parent link records how the states relate.',
'Add `append(3)` as the first line in the editor and run again. How does the history change after a fourth append?',
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
'Replace `snapshots[0]` with `snapshots[1]` in the first line and run again. Predict the new then count before looking at it.',
'What must remain available for time travel?', ['The retained snapshot and its referenced files','Only a snapshot ID written in a notebook','Only the newest metadata file'] ),
lesson('immutable',1,'Watch an append reuse files',
'Prove that an append preserves existing data files.',
'An append adds rows to a table. This example checks whether it can reuse the old data files rather than rewriting their rows.',
'Will an append replace the paths of the original three files?',
`before = {f.file.file_path for f in files()}
append(3)
after = {f.file.file_path for f in files()}
show({'reused':len(before & after),'new':len(after-before),'rows':table.scan().count()})`,
`assert before <= after
assert len(after-before) == 1
assert table.scan().count() == 160`,
'All three old files remain referenced and one file is added. New metadata and manifests describe the new state without copying the older Parquet files.',
'Insert `append(4)` immediately after `append(3)`, then run again. How many original paths are reused and how many new paths appear?',
'What must be written for this append?', ['Writing new data and committing new metadata','Rewriting every old row','Deleting all old snapshots'] ),
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
'Replace every `market` in the editor with `sales_region` and run again. Does another name change require different field IDs or files?',
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
'The new optional field reads as null for old rows in this example. Adding a column does not backfill business values into previously written data.',
'Inside the sql(...) call, replace the SQL string with `SELECT count(*) AS missing FROM orders WHERE priority IS NULL`, keeping the quotes around it. Then run again. Does missing account for all 120 orders?',
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
'Replace `DoubleType()` with `StringType()` in the `add_column` call, then run again. Does changing the new column’s type reconnect it to the retired values?',
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
'The Iceberg scan starts with three selected files containing 120 records. The SQL query then returns one matching order. In this lab’s sql helper, DuckDB applies WHERE after the Iceberg data has been read into memory. To test Iceberg file pruning, pass the condition directly to metrics or table.scan.',
'Add `show(metrics(\'order_id = 0\'))` at the end of the editor and run again. Does supplying the filter to Iceberg change selected_files?',
'Can one returned row prove only one row was scanned?', ['No; the number of returned rows and the scan work are different','Yes, always','Only when the result has one column'] ),
lesson('bounds',2,'Skip files with bounds',
'Pass a predicate to Iceberg and inspect file pruning.',
'A file’s bounds summarize its lowest and highest stored values. Iceberg can skip a file when those bounds prove that it cannot contain the requested order.',
'Which of the three files can contain order_id 1005?',
`all_files = metrics()
pruned = metrics('order_id = 1005')
show({'all':all_files,'pruned':pruned})
show(table.scan(row_filter='order_id = 1005').to_arrow())`,
`assert pruned['selected_files'] == 1
assert pruned['candidate_records'] == 40
assert table.scan(row_filter='order_id = 1005').count() == 1`,
'For order 1005, Iceberg selects the file covering IDs 1000–1039. That file contains 40 candidate records; the row filter then finds the one matching order. selected_file_bytes adds up selected file sizes. It does not measure bytes read from storage.',
'Replace both occurrences of `1005` with `999999` in the editor and run again. How many files can contain that value?',
'What does a bound prove?', ['A file can be ruled out when its range cannot match','Every value inside the range exists','A matching file contains only matching rows'] ),
lesson('residual',2,'Separate pruning from filtering',
'Explain why selecting a file does not select all its rows.',
'Every file in this example contains both EU and US orders. A filter on region therefore has two jobs: decide which files may contain EU orders, then select the matching rows within them.',
'Can file bounds remove any whole file for region = EU?',
`planned = metrics("region = 'EU'")
matched = table.scan(row_filter="region = 'EU'").count()
show({'plan':planned,'matched_rows':matched})`,
`assert planned['selected_files'] == 3
assert planned['candidate_records'] == 120
assert matched == 60`,
'All three files remain candidates, so their 120 records must still be considered. Only 60 rows match EU. The condition applied within the selected files is called the residual filter.',
'Replace both `EU` values in the editor with `APAC` and run again. What happens when no file can contain the requested region?',
'Why are all three files kept for EU?', ['Each file may contain EU rows','The filter is ignored','Iceberg cannot ever filter strings'] ),
lesson('identity-partition',2,'Partition for one predicate',
'Observe file pruning on a real identity-partitioned table.',
'Identity partitioning groups files by an unchanged column value, such as EU or US. The example’s region files are already prepared so you can inspect how an EU filter selects them.',
'Will partitioning reduce candidate records for region = EU?',
`planned = metrics("region = 'EU'")
show(planned)
show([{'spec_id':f.file.spec_id,'partition':str(f.file.partition),'rows':f.file.record_count}
      for f in files()])`,
`assert planned['total_files'] == 6
assert planned['selected_files'] == 3
assert planned['candidate_records'] == 60`,
'Three batches create six files, one per region per batch. The EU scan keeps three files and 60 candidate rows. Better pruning comes with more files to manage.',
'Replace `metrics("region = \'EU\'")` with `metrics(\'order_id = 1005\')` in the editor, then run again. Does a filter on a different column select the same files?',
'What is the tradeoff here?', ['Fewer candidate rows for region filters but more files','Every query becomes faster by definition','Partitioning eliminates metadata work'],0,{setup:'reset(partitioned=True)'}),
lesson('partition-evolution',2,'Evolve the specification',
'Read files written under old and new partition rules.',
'A partition specification records the rules used to group new files. This example adds a region rule after three unpartitioned files have already been written.',
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
'Insert `append(4)` immediately after `append(3)`, then run again. How many additional candidate records does the EU scan gain?',
'Does changing the spec rewrite historical files?', ['No; old and new specs coexist','Yes; all files move immediately','Only file names change'] ),
lesson('hidden-transforms',2,'Reason about hidden transforms',
'Find which day partitions overlap a timestamp condition.',
'A day partition groups timestamps by date. A query can use an exact timestamp range while a planner derives the possible dates, then checks the original time condition inside those dates.',
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
'The window overlaps two dates, so either day may contain matching rows. Other times in those days still need to be excluded by the timestamp condition. This is a Python projection model; the pinned browser writer cannot create day- or bucket-transformed files.',
'Replace `end = datetime(2026,1,2,0,30)` with `end = datetime(2026,1,2,0,0)`, then run again. How many days overlap the shorter window?',
'Why keep the timestamp predicate?', ['A whole day can include times outside the requested window','Partitions are always corrupt','The query must spell a physical partition column'],0,{kind:'Planning model'}),
lesson('small-files',3,'Count the cost of tiny batches',
'Compare file counts for two ways of writing the same number of rows.',
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
'Twelve one-row appends create twelve data files and snapshots; one twelve-row append creates one of each. The row counts match, but the generated order values differ. This demonstrates file and commit overhead rather than comparing equal query answers or measuring production speed.',
'Replace `range(12)` with `range(24)` and `rows=12` with `rows=24`, then run again. How do the file counts compare at the new, equal row count?',
'What typically grows with tiny commits?', ['File and metadata overhead','Only the number of table columns','The logical row count must change'] ),
lesson('compact',3,'Rewrite a fragmented table',
'Reduce current data-file count without changing the rows.',
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
'The rewrite replaces the three current data files with one new file and preserves the complete row values. The old files remain on disk for retained history. This small-table overwrite illustrates consolidation; it is not a distributed production compaction job.',
'Add `show(metrics())` immediately before the line starting with `table.overwrite`, and again at the end of the editor. Run again and compare `selected_file_bytes` as well as `selected_files`.',
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
'One affected file is replaced; two others are reused. The original file remains on disk for older snapshots. This is copy-on-write: the writer puts the surviving rows into a replacement data file instead of writing a separate delete file.',
'Replace `order_id = 0` with `order_id >= 2000` and run again. Does deleting every row in one file require writing a replacement file?',
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
'Add `show([task.file.file_path for task in files(old)])` at the end of the editor and run again. Which files does the older snapshot still reference?',
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
'Add `show(table.scan().count())` at the end of the editor and run again. Does removing the oldest snapshot change the current table’s 120 rows?',
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
'Three files are used only by older snapshots, but they are still referenced and readable. They are therefore not orphan files. A production cleanup process must also account for other references, metadata files, writes still in progress and a safe minimum file age.',
'Add `show(table.scan(snapshot_id=table.metadata.snapshots[0].snapshot_id).count())` at the end of the editor and run again. Can the first snapshot still read its rows?',
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
'Swap `note_a` and `note_b` throughout the editor, then run again. Which column is now added by the first successful writer?',
'What should a stale writer do next?', ['Reload and revalidate its intended change','Blindly replace the latest metadata pointer','Delete the other writer’s metadata'] ),
lesson('retry',4,'Reload before a compatible change',
'Preserve another writer’s change when adding a compatible column.',
'Writer A adds a note column. Writer B then reloads the updated table before adding source. The example shows what that reload preserves; it does not implement an automatic retry loop.',
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
'Replace `update.add_column(\'source\',StringType())` with `update.add_column(\'note\',StringType())` and run again. Read the error caused by trying to add an existing column; Reset code restores the original example.',
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
'Replace `expected = \'metadata-v1\'` with `expected = \'metadata-v0\'`, then run again. Does the pointer change when the expected starting state is wrong?',
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
'The tag remains on its original snapshot while main, the reference to the current state, advances. A tag supports naming a reproducible state; its retention settings and referenced files still matter.',
'Add `show({name: str(ref.snapshot_id) for name, ref in table.metadata.refs.items()})` at the end of the editor and run again. Which IDs do `main` and `report-close` select?',
'What does a tag do here?', ['Names a fixed snapshot','Copies every data file into a new table','Automatically follows the newest append'] ),
lesson('delete-tradeoff',4,'Compare delete strategies',
'Model the read/write tradeoff of copy-on-write and merge-on-read.',
'Copy-on-write replaces affected data files when rows change. Merge-on-read instead writes deletion information that readers apply later. This model compares part of the write and read cost of those two approaches.',
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
'Change `reads_before_rewrite` from `20` to `200` and run again. Which cost grows while the immediate write quantities stay fixed?',
'Which must be verified before choosing a delete strategy?', ['Writer and reader support plus workload costs','Only the format’s feature list','Only the smallest immediate write'],0,{kind:'Cost model'}),
lesson('compatibility',4,'Check the reader contract',
'Separate table-format features from implementation support.',
'Supporting an Iceberg format version does not establish support for every feature a table uses. This model compares declared requirements with two imaginary readers’ feature sets.',
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
'Add `\'day-transform\'` to the `required` set, leaving the reader sets unchanged, then run again. Which readers now lack a required feature?',
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
'Change `\'read_object\':True` to `\'read_object\':False` in `permissions` and run again. Which access path is now blocked?',
'Where must a direct-file bypass be addressed?', ['At the storage and credential boundary','Only in the navigation menu','Only by renaming the table'],0,{kind:'Governance model'}),
lesson('row-policy',5,'Test a row policy boundary',
'Distinguish a filtered result from protection of the source data.',
'An EU analyst should see EU orders. This example filters a list to show the intended result, then compares it with direct access to the full source. No trusted access policy is installed.',
'Will an application-side filter protect the underlying file?',
`# A policy model over real data; not trusted enforcement.
all_rows = table.scan().to_arrow().to_pylist()
governed = [row for row in all_rows if row['region'] == 'EU']
show({'governed_rows':len(governed),'direct_source_rows':len(all_rows)})`,
`assert len(governed) == 60
assert len(all_rows) == 120`,
'The filtered view returns 60 rows; direct source access returns 120. Real row-level policies require a trusted enforcement path and controls on bypass access. The browser is deliberately open to inspection.',
'Replace `row[\'region\'] == \'EU\'` with `row[\'region\'] == \'APAC\'` in the editor and run again. Does returning no governed rows remove access to the source?',
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
'Add `show({\'upper_bounds\':str(entry.data_file.upper_bounds)})` at the end of the editor and run again. Why would you also need the field types to interpret those bytes?',
'What should a data access review include?', ['Metadata and statistics as well as data files','Only SQL result tables','Only catalog descriptions'] ),
lesson('audit',5,'Make a query reproducible',
'Capture an evidence record for a report.',
'To reproduce a report after more data arrives, record the input state and query that produced it. A time stamp or table name alone does not identify those inputs.',
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
'Add `append(3)` followed by `show(sql(query, snapshot))` at the end of the editor and run again. Does the recorded state still return the original report after more data arrives?',
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
'Change `\'export\':True` to `\'export\':False` and run again. Which locations still need attention?',
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
'On the line beginning `protected =`, replace the dictionary with `{\'s1\':\'legal hold\'}` and run again. Which old snapshot is now eligible under this model’s rules?',
'What must be settled before destructive maintenance?', ['Retention requirements and protected references','Only the oldest timestamp','Only the largest file'],0,{kind:'Governance model'}),
lesson('workload',6,'Choose a layout for two queries',
'Compare two filters on the same file layout.',
'Region reports and individual-order lookups ask different questions. Compare their selected files on one layout instead of judging it from a single query.',
'Does the region layout prune equally well for both predicates?',
`region_query = metrics("region = 'EU'")
id_query = metrics('order_id = 1005')
show({'region_query':region_query,'id_query':id_query})`,
`assert region_query['selected_files'] == 3
assert id_query['selected_files'] == 2`,
'The EU filter keeps three 20-row files. Bounds for order ID 1005 keep both region files from its batch because their ID ranges overlap. Always inspect actual statistics rather than assuming a partition key is the only pruning mechanism.',
'Add `show(table.scan(row_filter=\'order_id = 1005\').count())` at the end of the editor and run again. Compare the matching row count with candidate_records for id_query.',
'What should drive layout evaluation?', ['A representative mix of predicates and measured candidates','One favorite query alone','The largest number of partitions possible'],0,{setup:'reset(partitioned=True)'}),
lesson('sort-layout',6,'Narrow bounds with ordering',
'Compare file ranges for identical rows arranged differently.',
'The same orders are written into two layouts in turn. One spreads nearby order IDs across files; the other groups nearby IDs together. Both layouts have three files.',
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
'The interleaved files have overlapping order-ID ranges, so all three may contain ID 5. Grouping nearby IDs narrows the ranges and leaves one candidate file. The rows and file count are unchanged. The code arranges these writes directly; it does not configure an Iceberg sort-order rule.',
'Replace both `\'order_id = 5\'` conditions with `\'order_id >= 0\'` and run again. Does the clustered layout still let the planner exclude files for a filter matching every order?',
'Why did grouping adjacent IDs help?', ['It made file bounds more selective','It created a primary-key index','It changed the logical result'] ),
lesson('cost-budget',6,'Estimate request overhead',
'Calculate a request-cost estimate and state its assumptions.',
'Reading the same amount of data from more files may require more requests. This model assumes those requests happen one after another, with a fixed delay for each one.',
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
'Change `request_ms` from `20` to `0` and run again. Do all three estimates become equal when the model ignores per-request overhead?',
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
'The grouped counts and totals match while live file count falls from three to one. Correctness comes first. This example has exact integer-valued amounts in float columns; arbitrary floating-point workloads need appropriate comparison tolerances.',
'In query, replace `sum(amount) AS total` with `sum(amount) AS total, min(order_id) AS first_id, max(order_id) AS last_id`. Run again. Do these additional aggregates still match before and after?',
'Which comparison is valid?', ['Equivalent results, controlled data, and explicitly defined work metrics','The fastest single run regardless of its answer','Different queries on different datasets'] ),
lesson('incident',6,'Repair a fragmented workload',
'Reduce the current file count and verify the grouped report is unchanged.',
'A region dashboard reads a table built from 12 small writes. Consolidate its current files, then check that each region’s count and amount total are preserved.',
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
'Add `show(metrics("region = \'EU\'"))` at the end of the editor and run again. Does one unpartitioned file let the EU query avoid considering US rows?',
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
    'limits':'Browser-local example; no distributed throughput or trusted policy enforcement'
}
show(record)`,
`assert record['observed']['answer'][0]['n'] == 60
assert record['risks'] and record['limits'] and record['next_measurement']`,
'The record connects observed counts and file-selection information to a proposed decision, its risks and a next measurement. A useful recommendation states which observations support it and which production tests could overturn it.',
'Replace the `decision` and `next_measurement` strings in the record with your own recommendation and a test that could change your mind. Run again and check that your observations still support the wording.',
'Which claim follows directly from these lessons?', ['Measured file selection and table behavior on the pinned local table','A guaranteed production speedup','A verified enterprise security boundary'] )
];
