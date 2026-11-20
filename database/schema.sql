CREATE TABLE IF NOT EXISTS app_users (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  app_role ENUM('ADMIN','ANALYST') NOT NULL DEFAULT 'ANALYST',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloud_resources (
  resource_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  provider VARCHAR(40) NOT NULL,
  resource_name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN','INVESTIGATING','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_incident_user FOREIGN KEY (created_by)
    REFERENCES app_users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dataset_name VARCHAR(255) NOT NULL,
  source_event_id VARCHAR(255),
  event_time DATETIME NULL,
  provider VARCHAR(40),
  actor VARCHAR(255),
  source_ip VARCHAR(64),
  action_name VARCHAR(255),
  resource_name VARCHAR(255),
  outcome VARCHAR(100),
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  raw_event JSON NOT NULL,
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dataset_source_event (dataset_name, source_event_id),
  INDEX idx_event_time (event_time),
  INDEX idx_event_severity (severity),
  INDEX idx_event_actor (actor)
);

CREATE TABLE IF NOT EXISTS incident_events (
  incident_id BIGINT NOT NULL,
  event_id BIGINT NOT NULL,
  PRIMARY KEY (incident_id, event_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES audit_events(event_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS investigation_notes (
  note_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  incident_id BIGINT NOT NULL,
  user_id BIGINT,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES app_users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_embeddings (
  embedding_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL UNIQUE,
  model_name VARCHAR(150) NOT NULL,
  embedding_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES audit_events(event_id) ON DELETE CASCADE
);

CREATE OR REPLACE VIEW v_incident_summary AS
SELECT
  i.incident_id,
  i.title,
  i.severity,
  i.status,
  i.created_at,
  COUNT(ie.event_id) AS linked_event_count
FROM incidents i
LEFT JOIN incident_events ie ON i.incident_id = ie.incident_id
GROUP BY i.incident_id, i.title, i.severity, i.status, i.created_at;

DELIMITER //
CREATE PROCEDURE sp_incident_event_counts()
BEGIN
  SELECT i.incident_id, i.title, COUNT(ie.event_id) AS event_count
  FROM incidents i
  LEFT JOIN incident_events ie ON i.incident_id = ie.incident_id
  GROUP BY i.incident_id, i.title;
END //
DELIMITER ;