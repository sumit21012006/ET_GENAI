-- Migration 005: transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  is_flagged BOOLEAN DEFAULT FALSE
);
