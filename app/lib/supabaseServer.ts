import { createClient } from "@supabase/supabase-js";

// service_role キーを使うサーバー専用クライアント。
// RLS をバイパスするため API Route からのみ使用すること。
// "use client" ファイルに import しないこと。
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
