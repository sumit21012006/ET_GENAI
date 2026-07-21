-- Migration 006: Row Level Security (demo-safe)
-- All tables: allow public read for hackathon demo

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mule_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Public SELECT policies (demo safe)
CREATE POLICY "public_read_calls"        ON calls        FOR SELECT USING (true);
CREATE POLICY "public_read_alerts"       ON alerts       FOR SELECT USING (true);
CREATE POLICY "public_read_reports"      ON reports      FOR SELECT USING (true);
CREATE POLICY "public_read_mule"         ON mule_accounts FOR SELECT USING (true);
CREATE POLICY "public_read_transactions" ON transactions  FOR SELECT USING (true);

-- Allow backend (anon key) to INSERT
CREATE POLICY "anon_insert_calls"        ON calls        FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_alerts"       ON alerts       FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_reports"      ON reports      FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_mule"         ON mule_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_transactions" ON transactions  FOR INSERT WITH CHECK (true);
