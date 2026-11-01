# YottaFlex Claims Network Investigator

A runnable, recruiter-oriented demo for connecting synthetic claimants, policies, incidents, providers, invoices, and payments to prioritize claims for human investigation. It includes deterministic data generation, validation, an explainable rules-based ranking, a local dashboard, ground-truth evaluation, SQL schema/seed exports, and tests.

**This is a synthetic-data triage demo. A score is not a fraud determination.** Shared addresses, repeated narratives, and repeat claims are not proof of wrongdoing.

## Run the demo

Requirements: Node.js 18 or newer. There are no third-party npm dependencies.

```sh
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The dashboard shows the full generated dataset, highest-ranked claims, validation exceptions, benchmark metrics, and scoring rules. Search or filter the claim list; click a row to inspect evidence and context. Stop the server with `Ctrl+C`.

The repository includes the full dataset under `data/generated/`. If regenerating it first:

```sh
npm run generate
npm run validate
npm run evaluate
npm start
```

For a smaller starter dataset:

```sh
node src/cli.js generate --scale starter --out data/demo
node src/cli.js validate --dir data/demo
node src/cli.js evaluate --dir data/demo
```

## Review the workflow

1. Generate master records first: claimants, policies, incidents, providers.
2. Generate claims, invoices, payments, claim/provider links, and append-only state events using deterministic parent IDs.
3. Add labelled patterns: controlled shared contacts, repeat narratives, a 90-day report delay, shared-household addresses, and repeat claims.
4. Keep the planted labels in `ground_truth.csv` / `.json`. The detector loads entity CSVs only; it does not load ground truth as features.
5. Validate the generated entities, score claims from source records, and compare results with claim-level labels.

The main rules and assumptions are visible in the dashboard and documented in [DESIGN_NOTES.md](DESIGN_NOTES.md). The dictionary defines fields and validation rules in [DATA_DICTIONARY.md](DATA_DICTIONARY.md); [schema.sql](schema.sql) documents keys, bridge tables, effective dates, and lifecycle events. See [PROMPT_HISTORY.md](PROMPT_HISTORY.md) and [AI_USAGE.md](AI_USAGE.md) for the requested LLM-use disclosure.

## Scoring

| Signal | Points |
|---|---:|
| Policy reference has no matching policy | +45 |
| Settled payments exceed approved amount | +45 |
| Displayed invoice number appears on multiple claims | +35 |
| Incident reported more than 30 days after occurrence | +25 |
| Email and phone pair appears on multiple claimants | +20 |
| Repeat claims | Up to +10 |

Scores are capped at 100. A score of 20 or more is **Investigate**; 10–19 is **Review**; below 10 is **No alert**. A missing policy, excess payment, and duplicate invoice remain explicit exception cases. The intentionally unrepresented contact network has no matching relationship edge, so the detector has to use its source contact evidence. Shared address and repeated narrative do not add points.

## Full generated baseline

The committed baseline uses seed `20261022` and contains 5,000 claims, 2,000 claimants, 500 providers, and 8,000 relationship edges. The generated counts for derived entities are recorded in `data/generated/manifest.json`. It also includes 5,000 incidents, 2,200 policies, 5,000 invoices, 2,483 payments, 5,000 claim/provider bridge rows, 216 fraud indicators, 213 investigations, and claim/payment state events. These secondary counts are rule-derived and may change if generator rules change.

Generated artifacts include entity CSVs, separate ground-truth CSV/JSON, `seed.sql` (ground truth excluded), `manifest.json` (synthetic provenance and hashes), `validation.json`, `ranked_claims.csv`, and `metrics.json`.

## Validation and reproducibility

```sh
npm test
npm run validate
npm run evaluate
npm run reproduce
```

The validator checks entity primary keys, foreign-key joins, enumerated values, ID formats, effective/date ordering, payment-to-invoice and payment-to-claim links, amount/status reconciliation, and state event consistency. The three deliberate negative scenarios are retained as labelled warnings; structural errors fail validation. `npm run reproduce` regenerates the full dataset twice and compares all output files byte-for-byte; the manifest also carries CSV SHA-256 checksums.

Current full-scale synthetic benchmark snapshot: 216 labelled claims, 216 true positives, 1 false positive, 0 false negatives; precision 99.5%, recall 100%, false-positive rate 0.02%. **These results are expected to be optimistic because the benchmark uses deliberately planted rules and synthetic data; they do not predict production performance.**

## Submission checklist

- [x] Runnable code, setup/run instructions, schema, dictionary, generated data, validation, evaluation, tests, and reproducibility evidence are included.
- [x] Prompt history and AI assistance are disclosed in the linked project notes.
- [ ] Public GitHub repository and submission URL: pending repository details from the candidate.

The repository has not been pushed yet. Once the candidate provides the target public repository, add this project without creating duplicate GitHub README or `.gitignore` files; both are already included here. Review the code and generated output before submission and make the commit history reflect the work accurately.

## Synthetic provenance

All data is generated locally. No external dataset or real personal, confidential, or medical information is used. Emails use `.test`, phone numbers and tax IDs are synthetic, and `manifest.json` records `synthetic_only: true`.
