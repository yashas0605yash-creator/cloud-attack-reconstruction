
USE cloud_attack_db;

-- Check available tables
SHOW TABLES;

-- Check table definitions
DESCRIBE app_users;
DESCRIBE incidents;
DESCRIBE audit_events;
DESCRIBE incident_events;
DESCRIBE investigation_notes;

-- Check primary and foreign key relationships
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE();

-- Check record counts
SELECT COUNT(*) AS total_users FROM app_users;
SELECT COUNT(*) AS total_incidents FROM incidents;
SELECT COUNT(*) AS total_events FROM audit_events;
SELECT COUNT(*) AS total_notes FROM investigation_notes;

-- Check whether any incident-event relationships are missing
SELECT e.event_id
FROM audit_events e
LEFT JOIN incident_events ie
    ON e.event_id = ie.event_id
WHERE ie.event_id IS NULL;
