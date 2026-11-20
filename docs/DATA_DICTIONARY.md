
# DATA DICTIONARY

The following is a suggested description. Confirm all columns against the actual MySQL schema.

| Table | Purpose |
|---|---|
| app_users | Stores application users and roles |
| cloud_resources | Stores cloud resource information |
| audit_events | Stores structured audit-event records |
| incidents | Stores investigation incidents |
| incident_events | Links incidents and audit events |
| investigation_notes | Stores investigation notes |
| audit_log | Stores selected application activity records |

## Chroma collection

Collection name: cloud_audit_events

Suggested document:
A readable description combining event type, actor, risk level and event description.

Suggested metadata:
- event_id
- event_type
- actor
- risk_level
- mysql_event_id
- is_demo

## Important

Document the actual embedding function/model used by your installed Chroma version. Do not guess or write a model name without verifying it.

The Chroma collection is an auxiliary search index. MySQL remains the source of truth for structured event records.
