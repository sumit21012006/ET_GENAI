-- Migration 002: alerts table + Realtime
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  threat_score INTEGER NOT NULL CHECK (threat_score BETWEEN 0 AND 100),
  matched_patterns JSONB DEFAULT '[]',
  reasoning TEXT,
  recommended_action TEXT DEFAULT 'MONITOR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Realtime on alerts
-- (Also enable via Supabase Dashboard → Database → Replication → alerts table)
ALTER TABLE alerts REPLICA IDENTITY FULL;
