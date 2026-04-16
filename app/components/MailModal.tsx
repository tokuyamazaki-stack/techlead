"use client";

import { useState } from "react";
import type { Company, UserSettings } from "../lib/types";

interface Props {
  company: Company;
  userSettings: UserSettings;
  templateType: "アポ獲得" | "資料送付";
  onClose: () => void;
}

type ProductType = "採用動画" | "動画分析ツール" | "CRM";

function signature(senderName: string, phone: string, email: string): string {
  return `───・───・───・───・───・───・───

株式会社R＆D

${senderName} (Yamazaki Toku)

東京都港区南青山5-4-27

Tel：${phone || "070-4425-0729"}

Mail：${email || "toku.yamazaki@randd-inc.com"}

URL：https://randd-inc.com/

───・───・───・───・───・───・───`;
}

// ── 採用動画 アポ獲得 ──────────────────────────────────────────
function buildRecruitAppointment(
  companyName: string,
  contactName: string,
  senderName: string,
  meetingUrl: string,
  phone: string,
  email: string
): string {
  const toLine = contactName ? `${contactName}様` : "ご担当者様";
  return `${companyName}
${toLine}

お世話になっております。

株式会社R&Dの${senderName}です。


本日はお忙しい中、お時間いただきありがとうございました。

また、お打ち合わせのお時間をいただき重ねて御礼申し上げます。

お電話にて、学生視点での採用支援の件でお話をさせていただきました。

現状をより詳しくお聞きしたいのと、

弊社の実績等のお話もさせていただければ幸いです。


弊社の実績をご共有させて頂きますのでご参考ください。

お打ち合わせ当日に、より詳しくご紹介させていただきます。


▽実績資料

https://box.immedio.io/p/randd-inc/recruit


当日は、以下URLよりご参加よろしくお願いいたします。

------------------------------------------------------------------------------------------------

【お打ち合わせ】

${meetingUrl || "（URLを入力してください）"}

------------------------------------------------------------------------------------------------


ご確認のほど何卒よろしくお願いいたします。

その他ご不明点やご質問等ございましたら、下記までご連絡下さい。

${signature(senderName, phone, email)}`;
}

// ── 採用動画 資料送付 ──────────────────────────────────────────
function buildRecruitMaterial(
  companyName: string,
  contactName: string,
  senderName: string,
  phone: string,
  email: string
): string {
  const toLine = contactName ? `${contactName}様` : "ご担当者様";
  return `${companyName}
${toLine}

お世話になっております。

株式会社R&Dの${senderName}です。


本日はお忙しい中、お時間いただきありがとうございました。


お電話にて、採用支援の件でお話をさせていただきました。

現状をより詳しくお聞きしたいのと、弊社の実績等のお話もさせていただければ幸いです。


弊社の実績をご共有させて頂きますのでご参考ください。


▽実績資料

https://box.immedio.io/p/randd-inc/recruit


採用動画コンテンツに関しまして、

社内でご検討があった際はご連絡いただけると幸いです。


5月頃に、改めてお電話およびメールにてご検討状況をお伺いするとともに、

その際にお打ち合わせの候補日程も併せてご提案させていただければと存じます。


ご確認のほど何卒よろしくお願い致します。


何かご不明点やご質問等ございましたら、下記までご連絡下さい。

${signature(senderName, phone, email)}`;
}

// ── 分析ツール アポ獲得（資料送付テンプレ＋打ち合わせURL） ─────
function buildAnalyticsAppointment(
  companyName: string,
  contactName: string,
  senderName: string,
  meetingUrl: string,
  phone: string,
  email: string
): string {
  const toLine = contactName ? `${contactName}様` : "ご担当者様";
  return `${companyName}
${toLine}

お世話になっております。

株式会社R&Dの${senderName}です。


本日はお忙しい中、お時間いただきありがとうございました。

また、お打ち合わせのお時間をいただき重ねて御礼申し上げます。

お電話にて、採用支援の件でお話をさせていただきました。

現状をより詳しくお聞きしたいのと、弊社の実績等のお話もさせていただければ幸いです。


弊社の実績をご共有させて頂きますのでご参考ください。

また、弊社サービス「REC Insight」のご案内資料を別途添付いたします。

ぜひご一読いただけますと幸いです。


▽実績資料

https://box.immedio.io/p/randd-inc/recruit


当日は、以下URLよりご参加よろしくお願いいたします。

------------------------------------------------------------------------------------------------

【お打ち合わせ】

${meetingUrl || "（URLを入力してください）"}

------------------------------------------------------------------------------------------------


ご確認のほど何卒よろしくお願いいたします。

その他ご不明点やご質問等ございましたら、下記までご連絡下さい。

${signature(senderName, phone, email)}`;
}

// ── 分析ツール 資料送付 ──────────────────────────────────────
function buildAnalyticsMaterial(
  companyName: string,
  contactName: string,
  senderName: string,
  phone: string,
  email: string
): string {
  const toLine = contactName ? `${contactName}様` : "ご担当者様";
  return `${companyName}
${toLine}

お世話になっております。

株式会社R&Dの${senderName}です。


本日はお忙しい中、お時間いただきありがとうございました。


お電話にて、採用支援の件でお話をさせていただきました。

現状をより詳しくお聞きしたいのと、弊社の実績等のお話もさせていただければ幸いです。


弊社の実績をご共有させて頂きますのでご参考ください。

また、弊社サービス「REC Insight」のご案内資料を別途添付いたします。

ぜひご一読いただけますと幸いです。


▽実績資料

https://box.immedio.io/p/randd-inc/recruit


採用動画コンテンツ、動画分析ツールに関しまして、

社内でご検討があった際はご連絡いただけると幸いです。


5月頃に、改めてお電話およびメールにてご検討状況をお伺いするとともに、

その際にお打ち合わせの候補日程も併せてご提案させていただければと存じます。


ご確認のほど何卒よろしくお願い致します。


何かご不明点やご質問等ございましたら、下記までご連絡下さい。

${signature(senderName, phone, email)}`;
}

export default function MailModal({ company, userSettings, templateType, onClose }: Props) {
  const [product, setProduct] = useState<ProductType>(
    templateType === "アポ獲得" ? "採用動画" : "採用動画"
  );
  const [meetingUrl, setMeetingUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const senderName = userSettings.name || "山崎　徳";
  const senderPhone = userSettings.phone || "070-4425-0729";
  const senderEmail = userSettings.email || "toku.yamazaki@randd-inc.com";
  const contactName = company.contactName || "";

  const subject = templateType === "アポ獲得"
    ? "【御礼とお打ち合わせ】R＆D"
    : "【御礼と資料実績】R&D";

  function buildBody(): string {
    if (product === "採用動画") {
      return templateType === "アポ獲得"
        ? buildRecruitAppointment(company.company, contactName, senderName, meetingUrl, senderPhone, senderEmail)
        : buildRecruitMaterial(company.company, contactName, senderName, senderPhone, senderEmail);
    } else if (product === "動画分析ツール") {
      return templateType === "アポ獲得"
        ? buildAnalyticsAppointment(company.company, contactName, senderName, meetingUrl, senderPhone, senderEmail)
        : buildAnalyticsMaterial(company.company, contactName, senderName, senderPhone, senderEmail);
    } else {
      // CRM
      return templateType === "アポ獲得"
        ? buildAnalyticsAppointment(company.company, contactName, senderName, meetingUrl, senderPhone, senderEmail)
        : buildAnalyticsMaterial(company.company, contactName, senderName, senderPhone, senderEmail);
    }
  }

  const emailBody = buildBody();

  function copyText() {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openGmail() {
    const to = company.contactEmail || "";
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm` +
      `&to=${encodeURIComponent(to)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, "_blank");
  }

  const PRODUCTS: ProductType[] = ["採用動画", "動画分析ツール", "CRM"];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] px-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">✉ メールテンプレート</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {templateType} · {company.company}
              {contactName && ` · ${contactName}様`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* 商材切り替え */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">商材を選択</label>
            <div className="flex gap-2">
              {PRODUCTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProduct(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    product === p
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 動画分析ツール選択時：PDF添付リマインダー */}
          {product === "動画分析ツール" && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg shrink-0">📎</span>
              <div>
                <p className="text-xs font-semibold text-amber-700">REC Insight資料を添付してください</p>
                <p className="text-xs text-amber-600/70 mt-0.5">Gmailで開いた後、「REC Insight ご案内資料.pdf」を手動で添付してください。</p>
              </div>
            </div>
          )}

          {/* アポ獲得のみ：打ち合わせURL */}
          {templateType === "アポ獲得" && (
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">
                打ち合わせURL <span className="text-slate-400">（Zoom / Google Meet など）</span>
              </label>
              <input
                type="text"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          )}

          {/* 宛先 */}
          {company.contactEmail && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
              <span className="text-xs text-slate-500">宛先</span>
              <span className="text-sm text-slate-700">{company.contactEmail}</span>
            </div>
          )}

          {/* 件名 */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">件名</label>
            <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 border border-slate-100">
              {subject}
            </div>
          </div>

          {/* 本文プレビュー */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">本文プレビュー</label>
            <pre className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-700 border border-slate-100 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
              {emailBody}
            </pre>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="px-6 pb-5 pt-3 border-t border-slate-100 shrink-0 flex gap-3">
          <button
            onClick={copyText}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800"
            }`}
          >
            {copied ? "✓ コピーしました" : "本文をコピー"}
          </button>
          <button
            onClick={openGmail}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white transition-all"
          >
            Gmailで開く
          </button>
        </div>
      </div>
    </div>
  );
}
