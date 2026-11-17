"""Deterministic fixtures and inspection helpers. All table operations are upstream PyIceberg."""
from shims import install
install()
import contextlib
import io
import json
import os
import shutil
import time
import zipfile
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import duckdb
from pyiceberg.catalog.sql import SqlCatalog
from pyiceberg.schema import Schema
from pyiceberg.types import NestedField, LongType, StringType, DoubleType
from pyiceberg.transforms import IdentityTransform
from pyiceberg.manifest import read_manifest_list

ROOT = '/warehouse'
catalog = None
table = None

def reset(batches=3, partitioned=False):
    """Recreate a small table. Each batch has 40 orders and a disjoint ID range."""
    global catalog, table
    if catalog is not None:
        catalog.engine.dispose()
    shutil.rmtree(ROOT, ignore_errors=True)
    os.makedirs(ROOT)
    catalog = SqlCatalog('lab', uri='sqlite:////warehouse/catalog.db', warehouse='file:///warehouse')
    catalog.create_namespace('shop')
    table = catalog.create_table('shop.orders', schema=Schema(
        NestedField(1,'order_id',LongType(),required=True),
        NestedField(2,'region',StringType(),required=True),
        NestedField(3,'amount',DoubleType(),required=True)), properties={'format-version':'2'})
    if partitioned:
        with table.update_spec() as update:
            update.add_field('region', IdentityTransform(), 'region_part')
    for batch in range(batches):
        append(batch)
    return table

def append(batch=3, rows=40):
    fields = table.schema().as_arrow()
    records = []
    for n in range(rows):
        values = {'order_id':batch*1000+n, 'region':['EU','US'][n%2],
                  'market':['EU','US'][n%2], 'amount':float(batch*100+n), 'priority':None}
        records.append({f.name:values.get(f.name) for f in fields})
    table.append(pa.Table.from_pylist(records, schema=fields))

def files(snapshot_id=None, predicate=None):
    args = {'snapshot_id':snapshot_id}
    if predicate: args['row_filter'] = predicate
    return list(table.scan(**args).plan_files())

def metrics(predicate=None):
    selected = files(predicate=predicate)
    return {'total_files':len(files()), 'selected_files':len(selected),
            'candidate_records':sum(x.file.record_count for x in selected),
            'selected_file_bytes':sum(x.file.file_size_in_bytes for x in selected)}

def history():
    return [{'id':str(s.snapshot_id),'parent':str(s.parent_snapshot_id),
             'operation':s.summary.operation.value,'sequence':s.sequence_number,
             'schema_id':s.schema_id} for s in table.metadata.snapshots]

def show(value):
    if isinstance(value, pa.Table):
        value = value.to_pylist()
    print(json.dumps(value, indent=2, default=str))

def sql(query, snapshot_id=None):
    # Iceberg plans and materializes the scan; DuckDB SQL runs AFTER that scan.
    con = duckdb.connect(config={'threads':1})
    try:
        con.register('orders', table.scan(snapshot_id=snapshot_id).to_arrow())
        result = con.execute(query)
        cols = [c[0] for c in result.description]
        return [dict(zip(cols,row)) for row in result.fetchmany(200)]
    finally:
        con.close()

def warehouse():
    return [{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size}
            for p in sorted(Path(ROOT).rglob('*')) if p.is_file()]

def evidence():
    table.refresh()
    return {'rows':table.scan().count(), 'schema_id':table.schema().schema_id,
            'spec_id':table.spec().spec_id, 'snapshots':len(table.metadata.snapshots),
            'live_files':len(files()), 'metadata':table.metadata_location,
            'history':history(), 'warehouse':warehouse()}

def export_zip():
    # Export includes SQLite catalog and all physical files, including retained history.
    catalog.engine.dispose()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for p in Path(ROOT).rglob('*'):
            if p.is_file(): archive.write(p, str(p.relative_to(ROOT)))
    return buffer.getvalue()

def inspect_path(relative):
    path = (Path(ROOT)/relative).resolve()
    if not path.is_relative_to(Path(ROOT)) or not path.is_file():
        raise ValueError('Choose a file inside the warehouse')
    if path.name.endswith('.metadata.json'):
        return json.loads(path.read_text())
    if path.suffix == '.parquet':
        parquet = pq.ParquetFile(path)
        return {'rows':parquet.metadata.num_rows, 'row_groups':parquet.metadata.num_row_groups,
                'schema':str(parquet.schema_arrow), 'head':parquet.read().slice(0,5).to_pylist()}
    if path.name.startswith('snap-') and path.suffix == '.avro':
        return [{'manifest_path':m.manifest_path, 'spec_id':m.partition_spec_id,
                 'added_files':m.added_files_count, 'existing_files':m.existing_files_count,
                 'deleted_files':m.deleted_files_count}
                for m in read_manifest_list(table.io.new_input(str(path)))]
    if path.suffix == '.avro':
        for snapshot in table.metadata.snapshots:
            for manifest in snapshot.manifests(table.io):
                if Path(manifest.manifest_path.replace('file://','')) == path:
                    return [{'status':str(e.status),'snapshot_id':str(e.snapshot_id),
                             'data_file':e.data_file.file_path, 'rows':e.data_file.record_count,
                             'bytes':e.data_file.file_size_in_bytes,
                             'lower_bounds':{str(k):v.hex() for k,v in (e.data_file.lower_bounds or {}).items()}}
                            for e in manifest.fetch_manifest_entry(table.io, discard_deleted=False)]
        return {'note':'Manifest is not referenced by a retained snapshot. Export to inspect externally.'}
    return {'path':relative,'bytes':path.stat().st_size,'note':'Binary catalog file; export to inspect with SQLite.'}

_lesson_keys = set()

def run(setup, code, check):
    global _lesson_keys
    output = io.StringIO()
    start = time.perf_counter()
    # Functions and editable code share a module namespace so reset() updates table everywhere.
    scope = globals()
    for key in _lesson_keys:
        scope.pop(key, None)
    original_keys = set(scope)
    with contextlib.redirect_stdout(output):
        try:
            exec(setup, scope)
            exec(code, scope)
        finally:
            # Failed experiments must not leak learner variables into the next run.
            _lesson_keys = set(scope)-original_keys
    # Checks only inspect learner results; they do not execute the example again.
    passed = False
    feedback = ''
    try:
        with contextlib.redirect_stdout(output):
            exec(check, scope)
        passed = True
        feedback = 'Evidence check passed. Now explain why the result follows.'
    except Exception as error:
        feedback = f'Check not met: {type(error).__name__}: {error}. Compare your evidence with the worked result.'
    return json.dumps({'output':output.getvalue(), 'passed':passed, 'feedback':feedback,
                       'elapsed_ms':round((time.perf_counter()-start)*1000), 'evidence':evidence()})
