import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 px-4 md:px-8 py-3 flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm z-30 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
            TL
          </div>
          <span className="text-base font-bold tracking-tight text-slate-800 hidden sm:block">TechLead</span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500">プライバシーポリシー</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-slate-400 mb-10">施行日：2026年4月25日</p>

        <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第1条（収集する情報）</h2>
            <p className="mb-2">本サービスでは、以下の情報を収集します。</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>アカウント情報：氏名、メールアドレス</li>
              <li>架電記録データ：コールリスト、企業情報、架電結果、通話メモ</li>
              <li>利用状況データ：ログイン日時、操作ログ</li>
              <li>端末情報：ブラウザ種別、OSバージョン（アクセス解析目的）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第2条（利用目的）</h2>
            <p className="mb-2">収集した情報は以下の目的で利用します。</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>本サービスの提供および機能の向上</li>
              <li>ユーザーサポートへの対応</li>
              <li>サービス改善のための統計分析（個人を特定しない形式）</li>
              <li>重要なお知らせ・メンテナンス情報の送付</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第3条（第三者への提供）</h2>
            <p className="mb-2">当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>ユーザーご本人の同意がある場合</li>
              <li>法令に基づく開示要請がある場合</li>
              <li>サービス運営に必要なインフラ提供者（Supabase、Vercel）への提供（業務委託の範囲内）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第4条（個人情報の管理）</h2>
            <p>収集した情報はSupabase上で暗号化して保管します。アクセス制御（Row Level Security）により、各ユーザーは自分のワークスペースのデータのみ閲覧・操作できます。当社は適切なセキュリティ対策を講じますが、完全なセキュリティを保証するものではありません。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第5条（個人情報の開示・訂正・削除）</h2>
            <p>ご自身の個人情報の開示、訂正、削除をご希望の場合は、下記お問い合わせ先までご連絡ください。合理的な期間内に対応いたします。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第6条（Cookieの使用）</h2>
            <p>本サービスでは、認証状態の維持のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、その場合、本サービスの一部機能が利用できなくなる場合があります。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第7条（個人情報保護法への対応）</h2>
            <p>当社は、個人情報の保護に関する法律（個人情報保護法）を遵守し、個人情報を適切に取り扱います。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第8条（お問い合わせ）</h2>
            <p>個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。</p>
            <div className="mt-3 bg-white border border-slate-200 rounded-xl px-5 py-4 text-slate-600">
              <p className="font-medium text-slate-800 mb-1">TechLead サポート</p>
              <p>メール：toku.yamazaki@randd-inc.com</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-violet-600 transition-colors">利用規約</Link>
          <Link href="/" className="hover:text-violet-600 transition-colors">← アプリに戻る</Link>
        </div>
      </main>
    </div>
  );
}
