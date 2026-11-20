
-- Create a separate practice database
CREATE DATABASE IF NOT EXISTS dbms_ddl_practice;

USE dbms_ddl_practice;

-- CREATE
CREATE TABLE ddl_demo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    description VARCHAR(100)
);

-- ALTER
ALTER TABLE ddl_demo
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- INSERT and SELECT
INSERT INTO ddl_demo (description)
VALUES ('DDL demonstration');

SELECT * FROM ddl_demo;

-- DROP only this disposable demonstration table
DROP TABLE ddl_demo;

-- Drop the practice database only when finished
-- DROP DATABASE dbms_ddl_practice;
