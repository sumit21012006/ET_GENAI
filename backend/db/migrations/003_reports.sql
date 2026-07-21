-- Migration 003: reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'app',
  status TEXT DEFAULT 'filed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
