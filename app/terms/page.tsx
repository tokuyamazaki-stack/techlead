import Link from "next/link";

export default function TermsPage() {
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
        <span className="text-sm text-slate-500">利用規約</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">利用規約</h1>
        <p className="text-sm text-slate-400 mb-10">施行日：2026年4月25日</p>

        <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第1条（サービスの概要）</h2>
            <p>TechLead（以下「本サービス」）は、インサイドセールスチームを対象とした架電管理SaaSです。コールリスト管理、架電結果記録、リアルタイム状況共有、AI分析、日報自動送信などの機能を提供します。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第2条（利用条件）</h2>
            <p className="mb-2">本サービスをご利用いただくには、以下の条件を満たす必要があります。</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>有効なメールアドレスでアカウントを登録していること</li>
              <li>本利用規約およびプライバシーポリシーに同意していること</li>
              <li>日本国内在住の法人または個人事業主であること</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第3条（禁止事項）</h2>
            <p className="mb-2">以下の行為を禁止します。</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>不正アクセスまたはシステムへの攻撃</li>
              <li>他のユーザーへの迷惑行為・ハラスメント</li>
              <li>虚偽の情報を登録する行為</li>
              <li>本サービスの複製・転売・再配布</li>
              <li>法令または公序良俗に違反する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第4条（免責事項）</h2>
            <p className="mb-2">当社は以下について責任を負いません。</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>システム障害、メンテナンス、または第三者の行為によるサービス停止</li>
              <li>本サービスの利用により生じた損害（逸失利益、データ損失を含む）</li>
              <li>ユーザーが登録した情報の正確性</li>
              <li>外部サービス（Supabase、Vercel等）の障害</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第5条（解約条件）</h2>
            <p>解約を希望する場合、管理者が当社サポートまでメールにて申請してください。月末締めで翌月から解約となります。月の途中での解約による日割り返金は行いません。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第6条（規約の変更）</h2>
            <p>当社は必要に応じて本規約を変更することがあります。変更の際は事前にサービス内またはメールにて通知します。変更後も継続してご利用いただいた場合、変更後の規約に同意したものとみなします。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">第7条（準拠法・裁判管轄）</h2>
            <p>本規約は日本法に準拠します。本規約に関する紛争は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-violet-600 transition-colors">プライバシーポリシー</Link>
          <Link href="/" className="hover:text-violet-600 transition-colors">← アプリに戻る</Link>
        </div>
      </main>
    </div>
  );
}
