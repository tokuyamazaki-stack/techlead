-- AI通話録音テーブル
create table if not exists call_recordings (
  id text primary key,
  company_id text,
  user_id text,
  workspace_id text,
  status text not null default 'waiting',
  transcript text,
  ai_result jsonb,
  created_at timestamptz default now()
);

-- RLS: 自分のワークスペースのレコードのみ読み書き可
alter table call_recordings enable row level security;

create policy "workspace members can read"
  on call_recordings for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()::text
    )
  );

create policy "owner can insert"
  on call_recordings for insert
  with check (user_id = auth.uid()::text);

create policy "service role bypass"
  on call_recordings for all
  using (true)
  with check (true);
