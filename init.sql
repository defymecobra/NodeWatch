-- NodeWatch Database Schema
-- PostgreSQL 16+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- TABLE: USERS
-- Stores all dashboard users with their roles.
-- Roles: 'admin', 'developer', 'guest'
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'developer'
                  CHECK (role IN ('admin', 'developer', 'guest')),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: PROJECTS
-- Each project is an application being monitored.
-- A user (owner) can own many projects.
-- ================================================
CREATE TABLE IF NOT EXISTS projects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    owner_id   UUID NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: API_KEYS
-- Keys used by external services to send logs.
-- One project can have multiple keys (e.g., prod, staging).
-- The actual key is stored only as a hash for security.
-- ================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
               REFERENCES projects(id) ON DELETE CASCADE,
    key_hash   VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hex of the raw key
    label      VARCHAR(100) NOT NULL DEFAULT 'default',
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: ERROR_LOGS
-- Core table. Stores all incoming error/log events.
-- payload (JSONB) stores stack trace, env, context.
-- error_hash (MD5) is used for deduplication.
-- occurrence_count increments instead of inserting duplicates.
-- ================================================
CREATE TABLE IF NOT EXISTS error_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID NOT NULL
                     REFERENCES projects(id) ON DELETE CASCADE,
    level            VARCHAR(20) NOT NULL DEFAULT 'error'
                     CHECK (level IN ('info', 'warn', 'error', 'critical')),
    message          TEXT NOT NULL,
    payload          JSONB,          -- { stack, file, line, env, context, ... }
    error_hash       VARCHAR(32) NOT NULL, -- MD5(message + stack)
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast deduplication lookups
CREATE INDEX IF NOT EXISTS idx_error_logs_hash_project
    ON error_logs (error_hash, project_id);

-- Index for dashboard queries (filter by project + time)
CREATE INDEX IF NOT EXISTS idx_error_logs_project_created
    ON error_logs (project_id, created_at DESC);

-- ================================================
-- TABLE: ALERT_CONFIGS
-- Defines notification rules per project.
-- When a log with matching level arrives, an alert is sent.
-- ================================================
CREATE TABLE IF NOT EXISTS alert_configs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL
                 REFERENCES projects(id) ON DELETE CASCADE,
    channel      VARCHAR(20) NOT NULL DEFAULT 'telegram'
                 CHECK (channel IN ('telegram', 'email')),
    recipient_id VARCHAR(255) NOT NULL, -- Telegram chat_id or email address
    min_level    VARCHAR(20)  NOT NULL DEFAULT 'error'
                 CHECK (min_level IN ('info', 'warn', 'error', 'critical')),
    is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ================================================
-- SEED DATA
-- Creates a default admin user (password: admin123)
-- and 3 sample projects for testing.
-- ================================================

-- Default admin user (password: 'admin123')
INSERT INTO users (id, email, password_hash, role)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@nodewatch.local',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- admin123
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Project 1: E-Commerce API
INSERT INTO projects (id, name, owner_id) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'E-Commerce API',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO api_keys (project_id, key_hash, label) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    encode(sha256('ecommerce-api-key'::bytea), 'hex'),
    'E-Commerce Key'
) ON CONFLICT DO NOTHING;

-- Project 2: Student Portal
INSERT INTO projects (id, name, owner_id) VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'Student Portal',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO api_keys (project_id, key_hash, label) VALUES (
    'b0000000-0000-0000-0000-000000000002',
    encode(sha256('student-portal-key'::bytea), 'hex'),
    'Student Portal Key'
) ON CONFLICT DO NOTHING;

-- Project 3: IoT Sensor Hub
INSERT INTO projects (id, name, owner_id) VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'IoT Sensor Hub',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO api_keys (project_id, key_hash, label) VALUES (
    'b0000000-0000-0000-0000-000000000003',
    encode(sha256('iot-sensor-hub-key'::bytea), 'hex'),
    'IoT Sensor Hub Key'
) ON CONFLICT DO NOTHING;
