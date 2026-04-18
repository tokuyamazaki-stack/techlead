-- ============================================================
-- TechLead RLS最終修正SQL（infinite recursion解消）
-- ============================================================

-- workspace_members: シンプルに「自分の行だけ見える」にする（ループなし）
drop policy if exists "メンバー参照" on workspace_members;
create policy "メンバー参照" on workspace_members for select
  using (user_id = auth.uid());

-- workspaces: オーナーか、自分がメンバーなら見える
drop policy if exists "ワークスペースメンバーのみ参照" on workspaces;
drop policy if exists "オーナーとメンバーが参照可" on workspaces;
create policy "オーナーとメンバーが参照可" on workspaces for select
  using (
    owner_id = auth.uid()
    OR id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
