# Database Design

Tables:
1. app_users
2. cloud_resources
3. incidents
4. audit_events
5. incident_events
6. investigation_notes
7. event_embeddings

The incident_events table implements a many-to-many relationship between incidents and audit events.

The v_incident_summary view summarizes incidents and their linked event counts.

The sp_incident_event_counts procedure demonstrates a stored procedure.

MySQL roles and GRANT permissions are created by scripts/setup.ps1.