-- ============================================================
-- TechLead リアルタイム同期 有効化SQL
-- ============================================================

alter publication supabase_realtime add table call_lists;
alter publication supabase_realtime add table companies;
alter publication supabase_realtime add table call_records;
