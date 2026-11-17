# Iceberg Lab

[Open the lab](https://snowch.github.io/iceberg-lab/) · [Runtime and limits](https://snowch.github.io/iceberg-lab/#guide)

42 small, focused lessons about Apache Iceberg: how tables work, how to design for a workload,
how to change and maintain tables safely, and where governance must be enforced.

Each lesson takes roughly five minutes before optional experimentation. It includes one objective,
a prediction, editable Python, an actual evidence check, a worked explanation, a one-variable variation
and an explanation question. Reading and running are independent paths. No account or backend is needed.

## Curriculum

1. **Find the table:** catalog pointer, membership, metadata JSON, manifest lists, manifest entries, Parquet field IDs.
2. **Change without losing identity:** ancestry, time travel, append reuse, rename, add columns, drop and re-add.
3. **Read less:** scan baseline, file bounds, residual filters, identity partitioning, partition evolution, hidden-transform projection.
4. **Maintain the warehouse:** tiny commits, consolidation, copy-on-write deletes, historical visibility, expiration, retained-file analysis.
5. **Commit safely:** real stale commits, revalidated retries, atomic publication, tags, delete-strategy tradeoffs, reader compatibility.
6. **Govern the whole path:** discovery versus access, row-policy boundaries, metadata exposure, audit evidence, erasure, retention.
7. **Design with evidence:** mixed workloads, ordered layouts, request-cost assumptions, correctness checks, repair, recommendations.

Inspired by the focused investigations and explicit measurement boundaries in
[Chris Snow's labs](https://snowch.github.io/labs/), especially the Parquet, Query Engine and PostgreSQL labs.

## Run locally

Requires Node.js 22+, npm, curl and a current browser. Python is not needed on the host.

```sh
npm ci
npm run dev
```

Open http://localhost:4173/iceberg-lab/ (root also works). The first build downloads approximately
46 MB of runtime assets. They are ignored by Git and rebuilt for Pages. All paths are relative so the
site works under the GitHub Pages project subpath.

```sh
npm run build       # static output: dist/
npm test            # content checks + all 42 lessons in actual Pyodide WASM under Node
npx playwright install chromium
npm run test:browser # browser worker, exports, checks, error recovery, mobile, deep links
```

To explicitly refresh assets, run `npm run assets -- --force`. Downloaded wheels are checked against the pinned
Pyodide lock file's SHA-256 values. A completed reduced lock file is written only after all downloads succeed.

## Deployment

GitHub Pages is configured for Actions. `.github/workflows/pages.yml` builds the self-contained static
site, runs content/WASM/browser verification, uploads `dist/`, and deploys successful main-branch builds.
Pull requests run the same verification but do not deploy. No repository secrets are needed.

## Architecture

```text
Static GitHub Pages
  ├── lesson reader, search, local drafts/progress, theme
  └── module Web Worker
        └── Pyodide 314.0.3 (CPython compiled to WASM)
              ├── PyIceberg 0.11.1 → SQLite SqlCatalog
              ├── PyArrow 22.0.0 → real Parquet and Iceberg file I/O
              ├── DuckDB 1.5.1 → SQL over Iceberg-planned Arrow scans
              └── /warehouse → metadata JSON, Avro manifests, Parquet, catalog.db
```

Runtime libraries and dependency wheels are served from this site's origin. Computation starts on demand;
there are no runtime CDN requests, remote catalogs, cloud credentials, telemetry or query servers.
All 42 lessons have independent fixtures. `public/python/lab.py` provides deterministic synthetic data,
inspection and export helpers; the operations in `public/lessons.js` call upstream PyIceberg.

## Measurement and implementation boundaries

- **Real Iceberg** lessons operate on real tables. Explicitly labelled models cover governance enforcement,
  hidden-transform projection, distributed publication, delete tradeoffs and illustrative engine capabilities.
- SQL materializes a PyIceberg scan before DuckDB execution. SQL predicates are not pushed into that scan.
  Use `table.scan(row_filter=...)` to exercise actual Iceberg pruning.
- Candidate records and selected file bytes are planning metrics, not measured I/O or network bytes.
  Displayed elapsed time includes fixture setup and the check. It is not a production query benchmark.
- Identity partition writes work. Native day/bucket write transforms are unavailable in this pinned build.
- Deletes are copy-on-write. Delete-file generation and distributed compaction are not implemented.
  Small-table consolidation uses a full overwrite and retains historical files.
- Snapshot expiration in this PyIceberg runtime updates metadata but does not delete physical files.
- Stale schema commits use the real catalog in a sequential writer interleaving, not a distributed service test.
- The synchronous-executor shim adapts scheduling; the S3 stub raises on use. Neither fabricates Iceberg data.
- Governance scenarios are inspectable models, not trusted security boundaries or compliance certifications.
- The warehouse lives in worker memory. Every run resets it; reload/stop discards it. Only drafts and review
  progress persist locally. Code/evidence and warehouse exports are explicit downloads.
- ZIP exports contain absolute `file:///warehouse/...` paths. Reopening requires extracting to `/warehouse`
  in an isolated environment, or deliberate path relocation. They are not relocatable REST catalogs.
- Exports include retained history. A logical DELETE is not an erasure guarantee.

The in-site laboratory guide explains these boundaries where learners can find them.

## Maintain the lessons

Lesson content lives in `public/lessons.js`. Keep each lesson to one question and a small experiment.
A lesson must specify a fresh `reset(...)` setup, checks that inspect its actual results, a worked explanation,
a meaningful variation and three explanation choices. Label models. Check experiments in the actual pinned WASM
runtime before changing expected behavior. Verify fixture correctness as well as the prose.

- `public/app.js`: accessible lesson reader and worker lifecycle.
- `public/worker.js`: worker protocol and local runtime loader.
- `public/python/lab.py`: fixtures, observations, file inspection and export.
- `tests/wasm.mjs`: every lesson, independent reruns, changed-code checks, recovery and exports.
- `tests/browser/lab.spec.mjs`: browser flow including the GitHub Pages subpath.

## Attribution

`public/python/shims.py` and `scripts/build-runtime.mjs` are adapted from
[iancmoritz/apacheprojects](https://github.com/iancmoritz/apacheprojects/tree/main/iceberg).
Their Apache-2.0 headers are retained; see `THIRD_PARTY_LICENSE_APACHE_2.0.txt` and `NOTICE`.
The runtime packager was changed to use proxy-aware curl downloads and verify SHA-256 integrity.
No prose, visual assets or implementation from Chris Snow's other labs is copied here.
Apache Iceberg, PyIceberg, Arrow, DuckDB and Pyodide remain their respective projects and trademarks.

## Learning and design refinements

Every lesson includes a concept explanation, optional saved prediction/reflection, progressive hints and an
output-reading cue. Each section ends with a transfer scenario and self-review rubric. Three task-oriented
entry paths complement the full sequence. These additions remain optional so the core lessons stay focused.

`public/learning.js` holds lesson scaffolds and section review prompts. `public/refinement.css` holds the
responsive visual refinements. [Learning, UX and design review](docs/learning-ux-review.md) records the review
criteria, available skill guidance, changes, verification and the distinction between implementation checks
and evidence of learning effectiveness.
