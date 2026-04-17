-- ============================================================
-- TechLead ワークスペース機能 追加SQL
-- Supabaseの「SQL Editor」に貼り付けて実行してください
-- ============================================================

-- ワークスペーステーブル（チームの単位）
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now()
);

-- ワークスペースメンバーテーブル
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'member',
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 招待テーブル（招待コードで参加）
create table if not exists workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  token text unique not null default gen_random_uuid()::text,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

-- call_listsにworkspace_idを追加
alter table call_lists add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- ============================================================
-- RLS更新
-- ============================================================

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invitations enable row level security;

-- workspaces: メンバーなら見られる
create policy "ワークスペースメンバーのみ参照" on workspaces for select
  using (
    id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
create policy "オーナーのみ作成" on workspaces for insert
  with check (auth.uid() = owner_id);
create policy "オーナーのみ更新" on workspaces for update
  using (auth.uid() = owner_id);

-- workspace_members
create policy "メンバー参照" on workspace_members for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
create policy "メンバー追加" on workspace_members for insert
  with check (true);
create policy "自分の脱退" on workspace_members for delete
  using (auth.uid() = user_id);

-- workspace_invitations
create policy "招待参照" on workspace_invitations for select
  using (true);
create policy "招待作成" on workspace_invitations for insert
  with check (
    created_by = auth.uid()
  );
create policy "招待削除" on workspace_invitations for delete
  using (created_by = auth.uid());

-- call_lists: ワークスペースメンバーなら全員アクセス可
drop policy if exists "自分のリストのみ" on call_lists;
create policy "ワークスペースメンバーがアクセス" on call_lists for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- companies: ワークスペースのリストに紐づく企業にアクセス可
drop policy if exists "自分の企業のみ" on companies;
create policy "ワークスペース企業アクセス" on companies for all
  using (
    list_id in (
      select id from call_lists where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
    or user_id = auth.uid()
  );

-- call_records: ワークスペースの企業に紐づく履歴にアクセス可
drop policy if exists "自分のコール履歴のみ" on call_records;
create policy "ワークスペースコール履歴アクセス" on call_records for all
  using (
    company_id in (
      select c.id from companies c
      join call_lists l on c.list_id = l.id
      where l.workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
    or user_id = auth.uid()
  );
