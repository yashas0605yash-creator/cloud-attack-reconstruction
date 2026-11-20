
USE cloud_attack_db;

-- 1. INSERT example
-- Use an existing valid resource_id if required by your schema.

-- 2. SELECT all audit events
SELECT *
FROM audit_events;

-- 3. ORDER BY
SELECT *
FROM audit_events
ORDER BY event_time DESC;

-- 4. WHERE
SELECT *
FROM audit_events
WHERE risk_level = 'HIGH';

-- 5. JOIN: incidents and their linked events
SELECT
    i.incident_id,
    i.title,
    e.event_id,
    e.event_type,
    e.risk_level
FROM incidents i
JOIN incident_events ie
    ON i.incident_id = ie.incident_id
JOIN audit_events e
    ON ie.event_id = e.event_id;

-- 6. GROUP BY
SELECT
    risk_level,
    COUNT(*) AS event_count
FROM audit_events
GROUP BY risk_level;

-- 7. HAVING
SELECT
    risk_level,
    COUNT(*) AS event_count
FROM audit_events
GROUP BY risk_level
HAVING COUNT(*) > 1;

-- 8. Aggregate functions
SELECT
    COUNT(*) AS total_events,
    MAX(event_time) AS latest_event,
    MIN(event_time) AS earliest_event
FROM audit_events;

-- 9. Subquery
SELECT *
FROM audit_events
WHERE event_id IN
(
    SELECT event_id
    FROM incident_events
);

-- 10. UPDATE example
-- Change only a known test record.
-- UPDATE incidents
-- SET status = 'INVESTIGATING'
-- WHERE incident_id = 1;

-- 11. DELETE example
-- Delete only a known test record after confirming dependencies.
-- DELETE FROM incidents
-- WHERE incident_id = 999999;
