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
-- and a sample project for testing.
-- ================================================

-- Default admin user (password: 'admin123')
-- Hash generated with bcrypt, 10 rounds
INSERT INTO users (id, email, password_hash, role)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@nodewatch.local',
    '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0/pCOBBWGLS', -- admin123
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Default demo project
INSERT INTO projects (id, name, owner_id)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Demo Project',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- Default API key for demo project
-- Raw key: "demo-api-key-do-not-use-in-production"
-- SHA-256: d41d8cd98f00b204e9800998ecf8427e (placeholder, will be regenerated)
INSERT INTO api_keys (project_id, key_hash, label)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    encode(sha256('demo-api-key-do-not-use-in-production'::bytea), 'hex'),
    'Demo Key'
) ON CONFLICT DO NOTHING;
