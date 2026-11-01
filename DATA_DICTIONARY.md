# Data dictionary

All IDs are immutable strings. Dates are ISO-8601 `YYYY-MM-DD` in UTC; event timestamps in the SQL schema are UTC. Amounts are decimal USD to 2 places unless a currency column says otherwise. `required` applies to generated CSV rows; blank `effective_to`, `closed_at`, and `outcome` mean the relationship/investigation remains open. IDs are unique within their entity, except `invoices.invoice_id` is an externally displayed number and may deliberately repeat; `invoice_record_id` is its unique key.

## Claimant (`claimants.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| claimant_id | string | yes | `CUS-2026-NNNNNN` | yes | immutable primary key |
| name | string | yes | synthetic name | no | non-empty |
| email | string | yes | `.test` domain | no | basic address shape |
| phone | string | yes | synthetic 555 number | no | non-empty |
| address | string | yes | synthetic address | no | non-empty; shared addresses are benign-capable |
| created_at | date | yes | ISO date | no | valid date |

## Policy (`policies.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| policy_id | string | yes | `POL-2026-NNNNNN` | yes | primary key |
| claimant_id | string | yes | claimant ID | no | FK to claimants |
| policy_type | enum | yes | auto, home, health | no | enum membership |
| effective_from / effective_to | date | yes | ISO date | no | from <= to |
| lifecycle_state | enum | yes | active | no | lifecycle value |
| coverage_limit | decimal | yes | USD | no | >= 0 |

## Claim (`claims.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| claim_id | string | yes | `CLM-2026-NNNNNN` | yes | primary key |
| claimant_id | string | yes | claimant ID | no | FK |
| policy_id | string | yes | policy ID | no | FK except labelled missing-policy exception |
| incident_id | string | yes | incident ID | no | FK |
| filed_at | date | yes | ISO date | no | not before incident report |
| status | enum | yes | submitted, under_review, approved, partially_approved, denied, paid | no | derived: missing policy → under_review; claimed > 125% of approved → denied; claimed > approved → partially_approved; otherwise approved; settled total equal to approved → paid |
| claimed_amount / approved_amount | decimal | yes | USD | no | >= 0; approved used for payment reconciliation |
| currency | string | yes | USD | no | ISO-like 3-letter code |

## Incident (`incidents.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| incident_id | string | yes | `INC-2026-NNNNNN` | yes | primary key |
| incident_type | enum | yes | collision, water_damage, theft, fire, hail, injury | no | enum membership |
| occurred_at / reported_at | date | yes | ISO date | no | occurred <= reported |
| location | string | yes | synthetic district | no | non-empty |
| narrative | string | yes | synthetic controlled text | no | repeated values are weak evidence |

## Provider (`providers.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| provider_id | string | yes | `PRV-NNNNNN` | yes | primary key |
| name | string | yes | synthetic | no | non-empty |
| provider_type | enum | yes | repairer, medical, tow, property_restoration | no | enum membership |
| tax_id | string | yes | `SYN-NNNNNNNN` | yes | synthetic token only |
| address | string | yes | synthetic | no | non-empty |
| created_at | date | yes | ISO date | no | valid date |

## Invoice (`invoices.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| invoice_record_id | string | yes | `INV-2026-NNNNNN` | yes | immutable row primary key |
| invoice_id | string | yes | `INV-PRV-<provider-id>-NNNNNN` | no | displayed number; duplicates are labelled exception |
| provider_id / claim_id | string | yes | provider / claim ID | no | FK |
| issued_at | date | yes | ISO date | no | valid date |
| amount | decimal | yes | USD | no | >= 0 |
| currency | string | yes | USD | no | 3-letter code |
| lifecycle_state | enum | yes | submitted | no | lifecycle value |

## Payment (`payments.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| payment_id | string | yes | `PAY-2026-NNNNNN` | yes | primary key |
| claim_id / invoice_record_id | string | yes | claim / invoice record ID | no | both foreign keys; invoice record ID remains unique even when displayed invoice number is duplicated |
| paid_at | date | yes | ISO date | no | valid date |
| amount | decimal | yes | USD | no | >= 0; compare total to claim approval |
| currency | string | yes | USD | no | 3-letter code |
| status | enum | yes | settled | no | lifecycle value |

## RelationshipEdge (`relationship_edges.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| edge_id | string | yes | `EDGE-2026-NNNNNN` | yes | primary key |
| source_type / target_type | enum | yes | claimant | no | valid entity type |
| source_id / target_id | string | yes | claimant ID | no | entity FK; endpoints differ |
| relationship_type | enum | yes | same_address, shared_contact, known_household, referral | no | enum membership |
| confidence | decimal | yes | [0,1] | no | inclusive range |
| effective_from | date | yes | ISO date | no | valid date |
| effective_to | date | optional | ISO date or blank | no | blank or >= start |
| source | string | yes | synthetic_generator | no | provenance |

## FraudIndicator (`fraud_indicators.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| indicator_id | string | yes | `IND-2026-NNNNNN` | yes | primary key |
| claim_id | string | yes | claim ID | no | FK |
| indicator_type | enum | yes | missing_policy_reference, payment_over_approval, duplicate_invoice, shared_contact_cluster | no | rule-derived |
| severity | enum | yes | low, medium, high | no | enum membership |
| evidence | string | yes | source-derived explanation | no | non-empty |
| created_at | date | yes | ISO date | no | valid date |

## Investigation (`investigations.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| investigation_id | string | yes | `INVG-2026-NNNNNN` | yes | primary key |
| claim_id | string | yes | claim ID | no | FK |
| assigned_role | enum | yes | operations_analyst, risk_compliance_reviewer | no | role membership |
| status | enum | yes | open, in_review, closed | no | transitions logged in event table |
| priority | enum | yes | low, medium, high | no | enum membership |
| opened_at | date | yes | ISO date | no | valid date |
| closed_at | date | optional | ISO date or blank | no | only closed cases; >= opened |
| outcome | string | optional | documented reviewer result | no | required on close |

## Supporting relational entities

`claim_providers` is a bridge table for claim N:M provider assignments, with service role and effective dates. The generated `claim_state_events.csv` and `payment_state_events.csv` store append-only from/to states, event time, actor, and reason. `claim_issues` stores issue_type, ground_truth_label, detection time, and resolution state. Their field constraints and keys are in `schema.sql`. Ground truth has `subject_type`, `subject_id`, `label`, `reason`, and `expected_decision`; it is intentionally not part of the operational input schema.

## State event exports

| Entity / field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| claim_state_events.event_id | string | yes | `CEVT-2026-NNNNNN` | yes | primary key |
| claim_state_events.claim_id | string | yes | claim ID | no | FK |
| prior_state | enum | optional | blank on first transition; otherwise claim lifecycle state | no | valid transition source |
| next_state | enum | yes | claim lifecycle values | no | matches exported claim state |
| occurred_at | timestamp | yes | UTC ISO-8601 | no | parseable timestamp |
| actor / reason | string | yes | synthetic_workflow / explanation | no | non-empty |

## ClaimProvider bridge (`claim_providers.csv`)

| Field | Type | Required | Allowed / unit | Unique | Validation |
|---|---|---:|---|---:|---|
| claim_id / provider_id | string | yes | claim / provider ID | composite with role and effective date | both parent FKs |
| service_role | enum | yes | repairer, medical, tow, property_restoration | no | matches provider type |
| effective_from | date | yes | invoice issue date | no | valid date |
| effective_to | date | optional | ISO date or blank | no | blank or >= start |
| payment_state_events.event_id | string | yes | `PEVT-2026-NNNNNN` | yes | primary key |
| payment_state_events.payment_id | string | yes | payment ID | no | FK |
| prior_state | enum | yes | pending | no | valid transition source |
| next_state | enum | yes | settled | no | matches exported payment state |
| occurred_at | timestamp | yes | UTC ISO-8601 | no | parseable timestamp |
| actor / reason | string | yes | synthetic_workflow / explanation | no | non-empty |
