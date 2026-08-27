#!/usr/bin/env python3
"""
Embed the plant-knowledge corpus into `ro_embeddings.doc_embeddings` for VECTOR_SEARCH.

The Document specialist has always issued a real VECTOR_SEARCH — against an empty table. One
of the assistant's four specialists therefore contributed nothing, and the harness said so
outright ("no plant-document corpus is available"). This fills it.

WHAT IS IN THE CORPUS, and what is not:

Only documents this project actually wrote — the six agent skills (fouling diagnosis, clean-
now-or-wait, antiscalant dosing, recovery optimisation, compliance check, delta economics),
the problem-domain and physics briefs, and EVIDENCE.md. These are genuine operating knowledge
for THIS plant, written by the team, and they state their own limits.

docs/04-ai-agent.md lists membrane manufacturer datasheets, OCWD SOPs and AWWA guides as the
intended corpus. Those are not here: they are third-party documents this repo does not hold,
and inventing plausible-looking datasheet numbers is precisely the failure the whole
provenance design exists to prevent. Every chunk therefore carries `source_document`, so an
operator can always see the answer came from a project design note rather than a datasheet.

Embeddings use BigQuery ML.GENERATE_EMBEDDING — in-place, per the architecture principle.

Usage:
    python embed_docs.py --dry-run
    GOOGLE_CLOUD_PROJECT=my-proj python embed_docs.py
"""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "spatial-cat-489006-a4")
DATASET_ID = os.environ.get("BQ_EMBEDDINGS_DATASET", "ro_embeddings")
TABLE = "doc_embeddings"
CONNECTION = os.environ.get("BQ_CONNECTION", "us-central1.vertex-ai")
EMBED_MODEL = "text-embedding-005"          # 768-dim, matches qa_cache

REPO = Path(__file__).resolve().parent.parent.parent

# (path, human-facing document name, category)
CORPUS: list[tuple[str, str, str]] = [
    ("services/agent/skills/fouling-diagnosis/SKILL.md", "Fouling Diagnosis Procedure", "procedure"),
    ("services/agent/skills/clean-now-or-wait/SKILL.md", "Clean-Now-or-Wait Decision Guide", "procedure"),
    ("services/agent/skills/antiscalant-dosing/SKILL.md", "Antiscalant Dosing Guide", "procedure"),
    ("services/agent/skills/recovery-optimization/SKILL.md", "Recovery Optimisation Guide", "procedure"),
    ("services/agent/skills/compliance-check/SKILL.md", "Compliance Check Procedure", "procedure"),
    ("services/agent/skills/delta-economics/SKILL.md", "Delta Economics Method", "procedure"),
    ("docs/01-problem-domain.md", "RO Problem Domain & Plant Economics", "reference"),
    ("docs/03-physics-engine.md", "WaterTAP Physics Engine Notes", "reference"),
    ("services/source-tracing/EVIDENCE.md", "Source-Tracing Evidence & Limits", "reference"),
    ("docs/12-google-native-audit.md", "Google-Native Architecture Audit", "reference"),
]

MAX_CHARS = 1400        # ~350 tokens; keeps a chunk inside one idea
MIN_CHARS = 120         # below this a chunk is a heading with no content


def chunk_markdown(text: str) -> list[tuple[str, str]]:
    """Split on markdown headings, then on paragraphs when a section runs long.

    Returns (heading, chunk_text). Splitting on headings rather than a fixed window keeps a
    procedure's steps with the procedure — a mid-sentence cut is what makes retrieved context
    read as nonsense.
    """
    # Drop YAML front matter; it is metadata, not knowledge.
    text = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S)

    sections: list[tuple[str, str]] = []
    current_heading = ""
    buffer: list[str] = []

    for line in text.splitlines():
        if re.match(r"^#{1,4}\s", line):
            if buffer:
                sections.append((current_heading, "\n".join(buffer).strip()))
                buffer = []
            current_heading = line.lstrip("#").strip()
        else:
            buffer.append(line)
    if buffer:
        sections.append((current_heading, "\n".join(buffer).strip()))

    chunks: list[tuple[str, str]] = []
    for heading, body in sections:
        if len(body) < MIN_CHARS:
            continue
        if len(body) <= MAX_CHARS:
            chunks.append((heading, body))
            continue
        # Long section: split on blank lines, packing paragraphs up to the limit.
        part: list[str] = []
        size = 0
        for para in body.split("\n\n"):
            if size + len(para) > MAX_CHARS and part:
                chunks.append((heading, "\n\n".join(part).strip()))
                part, size = [], 0
            part.append(para)
            size += len(para)
        if part:
            chunks.append((heading, "\n\n".join(part).strip()))
    return chunks


def build_chunks() -> list[dict]:
    rows = []
    for rel, name, category in CORPUS:
        path = REPO / rel
        if not path.exists():
            print(f"  skip (missing): {rel}")
            continue
        pieces = chunk_markdown(path.read_text(encoding="utf-8"))
        for i, (heading, body) in enumerate(pieces):
            rows.append({
                "chunk_id": f"{Path(rel).parent.name or Path(rel).stem}-{i:03d}",
                "source_document": name,
                "source_path": rel,
                "category": category,
                "section": heading,
                # The heading is prepended so the embedding carries the section's topic; a
                # chunk that reads "Use 3.0 psi" is meaningless without "Warning thresholds".
                "chunk_text": f"{name} — {heading}\n\n{body}" if heading else f"{name}\n\n{body}",
                "page_number": i + 1,
            })
        print(f"  {name}: {len(pieces)} chunks")
    return rows


def load(rows: list[dict]) -> None:
    from google.cloud import bigquery

    client = bigquery.Client(project=PROJECT_ID)
    staging = f"{PROJECT_ID}.{DATASET_ID}.doc_chunks_staging"
    target = f"{PROJECT_ID}.{DATASET_ID}.{TABLE}"

    schema = [
        bigquery.SchemaField("chunk_id", "STRING"),
        bigquery.SchemaField("source_document", "STRING"),
        bigquery.SchemaField("source_path", "STRING"),
        bigquery.SchemaField("category", "STRING"),
        bigquery.SchemaField("section", "STRING"),
        bigquery.SchemaField("chunk_text", "STRING"),
        bigquery.SchemaField("page_number", "INT64"),
    ]
    client.load_table_from_json(
        rows, staging,
        job_config=bigquery.LoadJobConfig(schema=schema, write_disposition="WRITE_TRUNCATE"),
    ).result()
    print(f"  staged {len(rows):,} chunks -> {staging}")

    # Embedding happens in BigQuery, in-place (CLAUDE.md architecture principle) rather than
    # by round-tripping every chunk through a client-side SDK call.
    client.query(f"""
        CREATE OR REPLACE MODEL `{PROJECT_ID}.{DATASET_ID}.embedding_model`
        REMOTE WITH CONNECTION `{PROJECT_ID}.{CONNECTION}`
        OPTIONS (ENDPOINT = '{EMBED_MODEL}')
    """).result()
    print("  embedding model ready")

    client.query(f"""
        CREATE OR REPLACE TABLE `{target}` AS
        SELECT
          chunk_id, source_document, source_path, category, section,
          content AS chunk_text, page_number,
          ml_generate_embedding_result AS embedding,
          CURRENT_TIMESTAMP() AS embedded_at
        FROM ML.GENERATE_EMBEDDING(
          MODEL `{PROJECT_ID}.{DATASET_ID}.embedding_model`,
          (SELECT *, chunk_text AS content FROM `{staging}`),
          STRUCT(TRUE AS flatten_json_output, 'RETRIEVAL_DOCUMENT' AS task_type)
        )
        WHERE ARRAY_LENGTH(ml_generate_embedding_result) > 0
    """).result()

    n = list(client.query(f"SELECT COUNT(*) n FROM `{target}`").result())[0].n
    print(f"  embedded {n:,} chunks -> {target}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="chunk and report, write nothing")
    args = ap.parse_args()

    print(f"Building corpus from {len(CORPUS)} documents")
    rows = build_chunks()
    if not rows:
        raise SystemExit("no chunks produced")

    chars = sum(len(r["chunk_text"]) for r in rows)
    print(f"\n  {len(rows)} chunks, {chars:,} chars, avg {chars // len(rows)} chars/chunk")

    if args.dry_run:
        print("\ndry run — nothing written. Sample:")
        for r in rows[:2]:
            print(f"\n  [{r['chunk_id']}] {r['source_document']} / {r['section']}")
            print("  " + r["chunk_text"][:220].replace("\n", "\n  "))
        return

    print(f"\nLoading into {PROJECT_ID}.{DATASET_ID}")
    load(rows)


if __name__ == "__main__":
    main()
