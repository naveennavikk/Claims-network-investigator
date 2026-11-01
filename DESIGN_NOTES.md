# Design notes for reviewers

## Problem and users

The demo supports operations analysts and risk/compliance reviewers who need to find connected claim activity, see which records support a lead, and preserve a traceable investigation path. It generates synthetic sources, creates explicit links, flags exceptions, ranks claims, and reports evaluation metrics.

## Decisions and trade-offs

| Decision | Reason | Trade-off |
|---|---|---|
| Node.js standard library, CSV files, and a small local HTTP server | Runs without package installation and is easy to reproduce from a clean checkout | This is a demo store, not a production transactional database |
| PostgreSQL-oriented `schema.sql` and ordered `seed.sql` | Shows relational keys and offers a path from CSV prototype to SQL | A PostgreSQL server is not required to run the dashboard |
| Separate `invoice_record_id` from displayed invoice number | Duplicate external invoice numbers can be represented without duplicate primary keys | A payment references the immutable invoice record key, not the ambiguous displayed number |
| Leave `claims.policy_id` unenforced as a database FK | Keeps the required missing-policy exception intact for review | The validator reports it as a deliberate warning, not a valid business join |
| Simple additive rules with evidence strings | Reviewers can understand why a claim was prioritized | Heuristics are intentionally limited and are not an adjudication model |
| Do not score shared addresses or repeat narratives | Benign households and common narratives should not trigger suspicion by themselves | More corroborating evidence would be needed for a real investigation system |
| Fixed LCG seed and stable row ordering | Reproducibility across starter/full scale and deterministic comparison | This pseudo-random generator is not intended for security-sensitive use |

## Relationships and lifecycle

Claimant has many policies and claims; each claim has one primary claimant, policy reference, and incident. Provider has many invoices. Claim and provider are many-to-many through `claim_providers`. A payment references both its claim and invoice record. Relationship edges connect claimant records and retain effective dates. Fraud indicators and investigations point to claims. Claim and payment state changes are append-only event rows; generated state snapshots reconcile to those rows.

The invalid policy case is the one deliberate FK exception, because an enforced FK would prevent exporting the negative case. Other parent links are validated. The duplicate invoice case duplicates the displayed invoice number across different claimant claims while preserving a unique invoice-record key.

## Generation assumptions

- Currency is USD and amounts are rounded to cents.
- Dates use ISO `YYYY-MM-DD`; event timestamps are UTC.
- Synthetic policy coverage is active from 2024 through the generated claim period. Approved amount is capped at policy coverage.
- Invoice dates follow claim filing dates; settlement dates follow invoice dates.
- Claim decision status is derived from source facts: a missing policy reference routes to review; claimed amount above 125% of the approved amount is denied; an amount above approval is partially approved; otherwise it is approved. A settled payment equal to the approved amount derives the final `paid` state. The payment-over-approval case remains an explicit labelled exception. The validator independently recomputes this rule.
- Household addresses and repeat claims are normal data variation. Contact pairs, late reporting, duplicate invoices, and invalid references create explicit evidence paths.

## Evaluation and limitations

`metrics.json` compares detector decisions against a separate ground-truth file. Labels are claim-level proxy labels, not real fraud findings. The high synthetic precision/recall is not evidence of real-world accuracy: the patterns are planted, labels are based on generator rules, class balance is artificial, and no out-of-time or external dataset is used. No personally identifiable data is present.

The demo has no authentication, persistent analyst edits, production workflow integrations, or real claims data. The dashboard is read-only and runs on localhost. It demonstrates generation, evidence display, exception handling, validation, and evaluation, rather than replacing claim review.

## Verification performed

The project was checked with Node syntax checks, `node --test`, full-scale `npm run validate`, `npm run evaluate`, and `npm run reproduce`. The final generated manifest and summary outputs are committed under `data/generated/`. Re-run those commands after changing generator logic.
