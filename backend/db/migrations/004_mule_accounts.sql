-- Migration 004: mule_accounts table
CREATE TABLE IF NOT EXISTS mule_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number_hash TEXT UNIQUE NOT NULL,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  bank TEXT,
  location TEXT,
  linked_case_ids JSONB DEFAULT '[]',
  flagged_at TIMESTAMPTZ DEFAULT NOW()
);
