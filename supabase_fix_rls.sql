-- ============================================================
-- TechLead RLS修正SQL
-- ワークスペース作成が止まるバグを修正します
-- ============================================================

-- workspaces: オーナー自身も見られるように修正
drop policy if exists "ワークスペースメンバーのみ参照" on workspaces;
create policy "オーナーとメンバーが参照可" on workspaces for select
  using (
    owner_id = auth.uid()
    OR id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- workspace_members: 無限ループになるポリシーを修正
drop policy if exists "メンバー参照" on workspace_members;
create policy "メンバー参照" on workspace_members for select
  using (
    user_id = auth.uid()
    OR workspace_id in (
      select id from workspaces where owner_id = auth.uid()
    )
  );
