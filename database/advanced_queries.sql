
USE cloud_attack_db;

-- =====================================================
-- 1. VIEW: Incident summary
-- =====================================================

CREATE OR REPLACE VIEW v_incident_summary AS
SELECT
    i.incident_id,
    i.title,
    i.severity,
    i.status,
    i.created_at,
    COUNT(DISTINCT ie.event_id) AS total_events,
    COUNT(DISTINCT n.note_id) AS total_notes
FROM incidents i
LEFT JOIN incident_events ie
    ON i.incident_id = ie.incident_id
LEFT JOIN investigation_notes n
    ON i.incident_id = n.incident_id
GROUP BY
    i.incident_id,
    i.title,
    i.severity,
    i.status,
    i.created_at;

-- Test the view
SELECT * FROM v_incident_summary;


-- =====================================================
-- 2. STORED PROCEDURE
-- =====================================================

DELIMITER //

CREATE PROCEDURE sp_incident_event_counts()
BEGIN
    SELECT
        i.incident_id,
        i.title,
        COUNT(ie.event_id) AS event_count
    FROM incidents i
    LEFT JOIN incident_events ie
        ON i.incident_id = ie.incident_id
    GROUP BY i.incident_id, i.title
    ORDER BY event_count DESC;
END //

DELIMITER ;

-- Execute procedure
CALL sp_incident_event_counts();


-- =====================================================
-- 3. INDEXING
-- =====================================================

CREATE INDEX idx_incident_severity
ON incidents(severity);

CREATE INDEX idx_incident_status
ON incidents(status);

CREATE INDEX idx_event_type
ON audit_events(event_type);

-- Check indexes
SHOW INDEX FROM incidents;
SHOW INDEX FROM audit_events;


-- =====================================================
-- 4. TRIGGER
-- =====================================================

DELIMITER //

CREATE TRIGGER trg_audit_event_insert
AFTER INSERT ON audit_events
FOR EACH ROW
BEGIN
    INSERT INTO audit_log
    (
        action_name,
        entity_type,
        entity_id,
        details
    )
    VALUES
    (
        'INSERT',
        'audit_event',
        CAST(NEW.event_id AS CHAR),
        JSON_OBJECT(
            'event_type', NEW.event_type,
            'risk_level', NEW.risk_level
        )
    );
END //

DELIMITER ;


-- =====================================================
-- 5. TRANSACTION EXAMPLE
-- Run only after confirming a valid created_by user ID.
-- =====================================================

START TRANSACTION;

INSERT INTO incidents
(
    title,
    description,
    severity,
    status,
    created_by
)
VALUES
(
    'Synthetic Training Investigation',
    'Demonstration transaction for DBMS project.',
    'LOW',
    'OPEN',
    1
);

-- Check the inserted row before committing
SELECT *
FROM incidents
ORDER BY incident_id DESC
LIMIT 1;

-- Use COMMIT only when you intend to save it.
-- COMMIT;

-- For a practice run that should be discarded:
-- ROLLBACK;
