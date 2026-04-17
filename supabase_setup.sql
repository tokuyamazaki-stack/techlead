-- ============================================================
-- TechLead データベース セットアップSQL
-- Supabaseの「SQL Editor」に貼り付けて実行してください
-- ============================================================

-- ユーザー設定テーブル
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default '',
  phone text default '',
  email text default '',
  calendar_url text default '',
  report_form_url text default '',
  report_form_fields jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- コールリストテーブル
create table if not exists call_lists (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  industry text default '',
  fiscal_month_from text default '',
  fiscal_month_to text default '',
  revenue_from text default '',
  revenue_to text default '',
  created_at timestamptz default now()
);

-- 企業テーブル
create table if not exists companies (
  id text primary key,
  list_id text references call_lists(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  company text not null default '',
  phone text default '',
  industry text default '',
  sub_industry text default '',
  employees text default '',
  revenue text default '',
  address text default '',
  contact_name text default '',
  direct_phone text default '',
  contact_email text default '',
  assignee text default '',
  latest_result text,
  next_date text default '',
  imported_at timestamptz default now()
);

-- コール履歴テーブル
create table if not exists call_records (
  id text primary key,
  company_id text references companies(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  result text not null,
  memo text default '',
  assignee text default '',
  products text[] default '{}',
  challenges text[] default '{}',
  interests text[] default '{}',
  ng_reason text default '',
  created_at timestamptz default now()
);

-- タグ設定テーブル
create table if not exists tag_configs (
  user_id uuid references auth.users on delete cascade primary key,
  products text[] default '{}',
  challenges text[] default '{}',
  interests text[] default '{}'
);

-- 目標設定テーブル
create table if not exists goal_configs (
  user_id uuid references auth.users on delete cascade primary key,
  daily_calls_per_person int default 30,
  monthly_appo_per_person int default 5,
  team_daily_calls int default 100,
  team_monthly_appo int default 20
);

-- ============================================================
-- RLS（アクセス制限）の設定
-- 自分のデータしか見られないようにする
-- ============================================================

alter table profiles enable row level security;
alter table call_lists enable row level security;
alter table companies enable row level security;
alter table call_records enable row level security;
alter table tag_configs enable row level security;
alter table goal_configs enable row level security;

-- profiles
create policy "自分のprofileのみ" on profiles for all using (auth.uid() = id);

-- call_lists
create policy "自分のリストのみ" on call_lists for all using (auth.uid() = user_id);

-- companies
create policy "自分の企業のみ" on companies for all using (auth.uid() = user_id);

-- call_records
create policy "自分のコール履歴のみ" on call_records for all using (auth.uid() = user_id);

-- tag_configs
create policy "自分のタグのみ" on tag_configs for all using (auth.uid() = user_id);

-- goal_configs
create policy "自分の目標のみ" on goal_configs for all using (auth.uid() = user_id);

-- ============================================================
-- 新規ユーザー登録時にprofileを自動作成するトリガー
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
