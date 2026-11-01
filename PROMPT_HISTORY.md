# Candidate project prompt

This is a consolidated, recruiter-friendly version of the candidate's original assignment brief and requirements. It has been edited for clarity; it is not presented as a verbatim transcript of the chat.

> I am building an executable synthetic insurance claims network investigator. Create a reproducible end-to-end workflow that links claimants, policies, claims, incidents, providers, invoices, payments, relationship edges, fraud indicators, and investigations so operations and compliance reviewers can prioritize suspicious networks and inspect the evidence.
>
> Use synthetic data only. Generate master records before dependent records, use immutable deterministic IDs and valid parent references, and preserve state transitions as append-only events. Include a data dictionary, relational schema, cardinality and lifecycle documentation, CSV/JSON/SQL exports, source manifest, README, validation report, and separate ground-truth labels that never enter detector input features.
>
> Support a starter and full scale from one fixed-seed, parameterized generator. The full baseline must contain 5,000 claims, 2,000 claimants, 500 providers, and 8,000 relationship edges. Include benign shared households and repeat claims as well as labelled cases for a missing policy reference, payment above approval, duplicate invoice number across claimants, a planted relationship absent from relationship edges, common addresses that are not proof, repeated narratives, and unusual incident-report timing.
>
> Validate primary keys, foreign keys, allowed values, date ordering, amounts and lifecycle consistency. Calculate scores and other derived outputs from source records. Rank known planted patterns with clear evidence, report measurable precision/recall and false-positive/false-negative rates, and demonstrate reproducibility by regenerating the same seed and comparing outputs. Build a local dashboard that a recruiter can run, use, and understand without relying on a real claims dataset.

## Follow-up direction

The candidate clarified that the project should open as an interactive browser dashboard, asked for a coverage review against the supplied acceptance criteria, and provided the submission rubric requiring runnable code, a public repository, prompt/AI-use disclosure, and visible design rationale. The candidate plans to provide the target repository separately; no public push has been made yet.

## AI contribution

AI assistance produced the implementation, data generator, schema, validation/evaluation code, tests, dashboard, and documentation. The candidate supplied the assignment context and acceptance requirements and directed the reviewer-facing presentation. See [AI_USAGE.md](AI_USAGE.md) and [DESIGN_NOTES.md](DESIGN_NOTES.md) for the contribution and decision records.
