/**
 * Solution membership area: preserves the automotive-editorial visual system while
 * giving signed-in customers a durable place for future AI and 360° projects.
 */
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CircleUserRound,
  Cuboid,
  ExternalLink,
  FileClock,
  Gauge,
  History,
  LogOut,
  Orbit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { startLogin } from "@/const";
import ABCompare from "@/components/ABCompare";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  listMemberPreviewHistory,
  type PreviewHistoryItem,
} from "@/lib/memberHistory";
import { WRAP_LOGO_ASSET_PATH } from "@shared/wrapAssetPaths";
import { useEffect, useState } from "react";

const futureModules = [
  {
    number: "01",
    title: "AI 車色預覽",
    english: "AI PREVIEWS",
    copy: "每次完成的 AI 改色預覽會自動保存，方便回來比較與延續。",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "360° 展示專案",
    english: "360° WORKSPACE",
    copy: "集中管理照片組、旋轉影片與互動式車輛展示專案。",
    icon: Orbit,
  },
  {
    number: "03",
    title: "服務與養護紀錄",
    english: "CARE HISTORY",
    copy: "日後可將諮詢、施工建議與養護資訊整理在同一個會員帳戶中。",
    icon: ShieldCheck,
  },
];

const goHome = () => {
  window.location.href = "/";
};

const goToPreview = () => {
  window.location.href = "/#wrap-preview";
};

const goToHistory = () => {
  window.location.href = "/member#preview-history";
};

const formatHistoryDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未提供";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function MemberHeader({
  isAuthenticated,
  name,
}: {
  isAuthenticated: boolean;
  name: string;
}) {
  return (
    <header className="border-b border-white/10 bg-[#0b0b0a]/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={goHome}
          className="group flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9ff44]"
          aria-label="回到 Solution 首頁"
        >
          <img
            src={WRAP_LOGO_ASSET_PATH}
            alt="Solution Car Wrap"
            className="h-auto w-[142px] object-contain object-left transition-transform duration-200 group-hover:scale-[1.025] sm:w-[162px]"
          />
          <span className="hidden border-l border-white/20 pl-3 text-[0.58rem] font-semibold tracking-[0.18em] text-white/45 sm:block">
            MEMBER ACCESS
          </span>
        </button>
        <div className="flex items-center gap-3">
          <span
            className={`hidden items-center gap-2 border px-3 py-2 text-[0.59rem] font-bold tracking-[0.13em] sm:flex ${isAuthenticated ? "border-[#a9ff44]/55 bg-[#a9ff44]/10 text-[#a9ff44]" : "border-white/15 text-white/45"}`}
          >
            <span
              className={`status-dot !h-1.5 !w-1.5 ${isAuthenticated ? "" : "!bg-white/30"}`}
              aria-hidden="true"
            />
            {isAuthenticated ? `${name} · 登入中` : "尚未登入"}
          </span>
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.15em] text-white/60 transition-colors hover:text-[#a9ff44]"
          >
            <ArrowLeft size={15} /> 回到網站
          </button>
        </div>
      </div>
    </header>
  );
}

function MemberIntro() {
  return (
    <section className="relative overflow-hidden px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute right-[11%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#a9ff44]/65 to-transparent" />
      <div className="relative mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:gap-20">
        <div>
          <p className="eyebrow">SOLUTION MEMBER ACCESS</p>
          <h1 className="font-display mt-6 max-w-4xl text-[clamp(3.5rem,8.7vw,8.7rem)] font-semibold uppercase leading-[0.78] tracking-[-0.055em] text-[#f3f4ee]">
            YOUR CAR,
            <br />
            <span className="text-white/42">IN PROGRESS.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-white/65 sm:text-lg">
            將 AI 車色預覽、360°
            展示與後續養護資訊收進同一個會員工作區。先登入或建立會員，下一次回來時就能從上次的選擇繼續。
          </p>
          <button
            type="button"
            onClick={startLogin}
            className="mt-9 flex items-center gap-4 bg-[#a9ff44] px-5 py-4 text-xs font-bold tracking-[0.13em] text-[#10130a] transition-all duration-200 hover:bg-white active:scale-[0.97]"
          >
            登入／建立會員 <ArrowUpRight size={15} strokeWidth={2.4} />
          </button>
          <p className="mt-4 max-w-lg text-xs leading-5 text-white/42">
            登入後，每次完成的 AI
            車色預覽會與原始車照成對保存到「預覽歷史」，可使用 A｜B 比較。
          </p>
        </div>

        <div className="relative border border-white/15 bg-[#11130f] p-5 sm:p-7">
          <div className="technical-frame pointer-events-none absolute inset-3 border-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between border-b border-white/12 pb-4">
              <div>
                <p className="text-[0.59rem] font-semibold tracking-[0.2em] text-[#a9ff44]">
                  MEMBER WORKSPACE
                </p>
                <p className="mt-2 text-sm text-white/55">
                  登入後的專屬汽車專案入口
                </p>
              </div>
              <CircleUserRound
                size={24}
                strokeWidth={1.35}
                className="text-white/72"
              />
            </div>
            <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-3">
              {[
                ["AI 預覽", "0", "PREVIEWS"],
                ["360° 專案", "0", "PROJECTS"],
                ["已儲存", "0", "SAVED"],
              ].map(([label, value, detail]) => (
                <div key={label} className="bg-[#11130f] p-4">
                  <p className="text-[0.59rem] font-semibold tracking-[0.14em] text-white/42">
                    {detail}
                  </p>
                  <p className="font-display mt-3 text-4xl leading-none text-[#f3f4ee]">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-white/60">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 border-l border-[#a9ff44] pl-4 text-sm leading-6 text-white/60">
              <Gauge size={18} className="shrink-0 text-[#a9ff44]" />
              會員專區將成為日後管理生成額度、作品與服務紀錄的單一入口。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberDashboard({
  name,
  email,
  onLogout,
  history,
  historyLoading,
  historyError,
  onRetryHistory,
}: {
  name: string;
  email?: string | null;
  onLogout: () => void;
  history: PreviewHistoryItem[];
  historyLoading: boolean;
  historyError: string;
  onRetryHistory: () => void;
}) {
  const previewCount = history.length >= 50 ? "50+" : String(history.length);
  const [compareHistoryId, setCompareHistoryId] = useState<number | null>(null);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10 px-5 pb-14 pt-14 sm:px-8 lg:px-10 lg:pb-20 lg:pt-20">
        <div className="hero-scan-grid pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-8 border-b border-white/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">MEMBER WORKSPACE · ACTIVE</p>
              <h1 className="font-display mt-5 text-[clamp(3.25rem,7vw,7.4rem)] font-semibold uppercase leading-[0.79] tracking-[-0.052em]">
                HELLO,
                <br />
                <span className="text-white/45">{name}.</span>
              </h1>
              {email ? (
                <p className="mt-5 text-sm text-white/48">{email}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-[#a9ff44]/55 bg-[#a9ff44]/10 px-3 py-2 text-[0.61rem] font-bold tracking-[0.15em] text-[#a9ff44]">
                MEMBER · EARLY ACCESS
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 border border-white/20 px-3 py-2 text-[0.64rem] font-semibold tracking-[0.13em] text-white/70 transition-colors hover:border-white/55 hover:text-white"
              >
                <LogOut size={14} /> 登出
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              ["AI 車色預覽", previewCount, "已保存預覽"],
              ["360° 展示", "0", "待建立專案"],
              ["服務紀錄", "—", "功能準備中"],
            ].map(([title, count, detail]) => (
              <div key={title} className="bg-[#0b0b0a] p-5 sm:p-6">
                <p className="text-[0.62rem] font-semibold tracking-[0.15em] text-white/45">
                  {title}
                </p>
                <p className="font-display mt-4 text-5xl leading-none text-[#f3f4ee]">
                  {count}
                </p>
                <p className="mt-3 text-sm text-white/55">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#11130f] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1600px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="eyebrow">YOUR NEXT ACTION</p>
            <h2 className="font-display mt-5 text-[clamp(2.8rem,5.8vw,6.4rem)] font-medium uppercase leading-[0.81] tracking-[-0.048em]">
              BUILD THE
              <br />
              <span className="text-white/42">NEXT VIEW.</span>
            </h2>
            <p className="mt-7 max-w-sm text-sm leading-7 text-white/60">
              先從一張車照與顏色選擇開始；未來這裡會接續保存 360°
              影像素材與可分享的車輛展示連結。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={goToPreview}
              className="group flex min-h-64 flex-col justify-between border border-[#a9ff44]/60 bg-[#a9ff44] p-6 text-left text-[#10130a] transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <Sparkles size={25} strokeWidth={1.5} />
                <ArrowUpRight size={18} />
              </div>
              <div>
                <p className="text-[0.62rem] font-bold tracking-[0.17em] text-black/60">
                  START HERE
                </p>
                <p className="font-display mt-3 text-4xl leading-[0.84] tracking-[-0.035em]">
                  AI 車色
                  <br />
                  預覽
                </p>
              </div>
            </button>
            <div className="relative flex min-h-64 flex-col justify-between border border-white/15 bg-[#0b0b0a] p-6 text-white">
              <span className="absolute right-5 top-5 border border-white/18 px-2 py-1 text-[0.55rem] font-bold tracking-[0.14em] text-white/48">
                準備中
              </span>
              <Cuboid size={25} strokeWidth={1.35} className="text-[#a9ff44]" />
              <div>
                <p className="text-[0.62rem] font-bold tracking-[0.17em] text-white/42">
                  UP NEXT
                </p>
                <p className="font-display mt-3 text-4xl leading-[0.84] tracking-[-0.035em]">
                  360°
                  <br />
                  展示專案
                </p>
                <p className="mt-4 text-sm leading-6 text-white/55">
                  照片組、旋轉影片與 AI 模擬結果將在此集中管理。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#cfd1cb] px-5 py-16 text-[#11130e] sm:px-8 lg:px-10 lg:py-24">
        <div className="relative mx-auto max-w-[1600px]">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="eyebrow !text-[#4e5740]">MEMBER BENEFITS / 01—04</p>
              <h2 className="font-display mt-5 text-[clamp(2.8rem,5.8vw,6.4rem)] font-medium uppercase leading-[0.8] tracking-[-0.05em]">
                WHAT YOU
                <br />
                <span className="text-[#5d6758]">CAN DO.</span>
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-7 text-black/58">
                會員登入後，這裡就是你的車色決策與作品整理入口；已開放的功能會直接顯示在下方。
              </p>
            </div>
            <div className="grid gap-px border border-black/15 bg-black/15 sm:grid-cols-2">
              {[
                [
                  "01",
                  "保存 AI 車色預覽",
                  "每次生成完成後，自動收進你的預覽歷史。",
                ],
                [
                  "02",
                  "回看與比較結果",
                  "依日期、色號與輸出比例瀏覽過往圖片。",
                ],
                [
                  "03",
                  "建立 360° 展示",
                  "照片組與互動車輛展示工作區，準備中。",
                ],
                ["04", "管理服務資訊", "未來可集中整理諮詢、施工與養護紀錄。"],
              ].map(([number, title, copy]) => (
                <article key={number} className="bg-[#dfe1db] p-5 sm:p-6">
                  <p className="font-display text-lg text-[#56732d]">
                    {number}
                  </p>
                  <h3 className="mt-8 text-lg font-bold tracking-[-0.025em]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{copy}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goToPreview}
              className="flex items-center gap-3 bg-[#a9ff44] px-4 py-3 text-xs font-bold tracking-[0.12em] text-[#10130a] transition-colors hover:bg-white"
            >
              開始新的 AI 預覽 <ArrowUpRight size={15} />
            </button>
            <button
              type="button"
              onClick={goToHistory}
              className="flex items-center gap-3 border border-black/25 px-4 py-3 text-xs font-bold tracking-[0.12em] text-black/70 transition-colors hover:border-[#56732d] hover:text-[#30421f]"
            >
              查看過往預覽 <History size={15} />
            </button>
          </div>
        </div>
      </section>

      <section
        id="preview-history"
        className="relative overflow-hidden border-b border-white/10 px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative mx-auto max-w-[1600px]">
          <div className="flex flex-col justify-between gap-5 border-b border-white/15 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">AI PREVIEW ARCHIVE</p>
              <h2 className="font-display mt-4 text-[clamp(2.5rem,5.4vw,5.8rem)] font-medium uppercase leading-[0.82] tracking-[-0.048em]">
                YOUR
                <br />
                HISTORY
              </h2>
            </div>
            <div className="max-w-sm text-sm leading-6 text-white/50">
              <p>
                每次登入會員後完成的 AI 車色預覽會先暫存 3
                天；按下圖片上的「儲存圖片」後，保存期限延長為 30 天。
              </p>
              <p className="mt-2 text-xs text-white/35">
                原始車照與生成結果會同步保存；兩者遵循相同的 3 天／30 天期限。
              </p>
            </div>
          </div>

          {historyLoading ? (
            <div className="mt-8 border-l border-[#a9ff44] px-4 py-5 text-sm text-white/60">
              正在讀取你的過往預覽…
            </div>
          ) : historyError ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-l-2 border-amber-300 bg-amber-300/10 px-4 py-4 text-sm text-amber-50">
              <span>{historyError}</span>
              <button
                type="button"
                onClick={onRetryHistory}
                className="border border-amber-200/50 px-3 py-2 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-amber-100 hover:text-black"
              >
                重新讀取
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="mt-8 border border-white/12 bg-[#11130f] px-6 py-10">
              <div className="flex items-start gap-4">
                <FileClock size={24} className="mt-1 shrink-0 text-[#a9ff44]" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    還沒有預覽紀錄
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                    回到 AI
                    車色預覽上傳照片並完成第一次生成；完成後，圖片會自動出現在這個區塊。
                  </p>
                  <button
                    type="button"
                    onClick={goToPreview}
                    className="mt-5 flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#a9ff44] hover:text-white"
                  >
                    前往 AI 車色預覽 <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {history.map(item => (
                <article
                  key={item.id}
                  className="overflow-hidden border border-white/15 bg-[#11130f]"
                >
                  <div
                    className="relative overflow-hidden bg-[#070807]"
                    style={{ aspectRatio: item.aspectRatio.replace(":", " /") }}
                  >
                    {compareHistoryId === item.id && item.originalImageUrl ? (
                      <ABCompare
                        beforeUrl={item.originalImageUrl}
                        afterUrl={item.previewUrl}
                        beforeLabel="A ORIGINAL"
                        afterLabel="B AI PREVIEW"
                        alt={`${item.pantoneId} 原圖與 AI 預覽比較`}
                        className="absolute inset-0"
                      />
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt={`${item.pantoneId} AI 車色預覽`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <span className="absolute left-3 top-3 border border-[#a9ff44]/60 bg-black/65 px-2 py-1 text-[0.56rem] font-bold tracking-[0.12em] text-[#a9ff44] backdrop-blur-sm">
                      {item.pantoneId}
                    </span>
                    <span className="absolute right-3 top-3 border border-white/25 bg-black/65 px-2 py-1 text-[0.56rem] font-bold tracking-[0.08em] text-white/75 backdrop-blur-sm">
                      {item.isSaved ? "已保存 30 天" : "暫存 3 天"}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.58rem] font-bold tracking-[0.15em] text-white/40">
                          GENERATED PREVIEW
                        </p>
                        <p className="mt-2 text-xs text-white/65">
                          {formatHistoryDate(item.createdAt)}
                        </p>
                      </div>
                      <a
                        href={item.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center border border-white/20 text-white/60 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
                        aria-label="開啟預覽原圖"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/45">
                      輸出比例：{item.aspectRatio}
                      {item.outputSize ? ` · ${item.outputSize}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      保存至：{formatHistoryDate(item.expiresAt)}
                    </p>
                    {item.partialWrapCustomizations.length > 0 && (
                      <p className="mt-2 text-xs text-[#a9ff44]/75">
                        已包含 {item.partialWrapCustomizations.length}{" "}
                        項局部包膜設定
                      </p>
                    )}
                    {item.originalImageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setCompareHistoryId(current =>
                            current === item.id ? null : item.id
                          )
                        }
                        className={`mt-4 flex items-center gap-2 border px-3 py-2 text-xs font-bold tracking-[0.08em] transition-colors ${compareHistoryId === item.id ? "border-[#a9ff44] bg-[#a9ff44]/15 text-[#a9ff44]" : "border-white/20 text-white/65 hover:border-[#a9ff44] hover:text-[#a9ff44]"}`}
                      >
                        A｜B 比較
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative mx-auto max-w-[1600px]">
          <div className="flex flex-col justify-between gap-5 border-b border-white/15 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">PROJECT INDEX</p>
              <h2 className="font-display mt-4 text-[clamp(2.5rem,5.4vw,5.8rem)] font-medium uppercase leading-[0.82] tracking-[-0.048em]">
                YOUR WORKSPACE
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/50">
              目前尚未有已儲存的專案。當 AI 預覽與 360°
              功能連接會員帳戶後，作品會從這裡開始累積。
            </p>
          </div>
          <div className="mt-6 grid gap-px border border-white/12 bg-white/10 md:grid-cols-3">
            {futureModules.map(module => {
              const Icon = module.icon;
              return (
                <article key={module.number} className="bg-[#0b0b0a] p-6">
                  <div className="flex items-start justify-between">
                    <span className="font-display text-lg text-[#a9ff44]">
                      {module.number}
                    </span>
                    <Icon
                      size={20}
                      strokeWidth={1.4}
                      className="text-white/68"
                    />
                  </div>
                  <p className="mt-10 text-[0.6rem] font-bold tracking-[0.16em] text-white/40">
                    {module.english}
                  </p>
                  <h3 className="mt-3 text-xl font-bold tracking-[-0.025em] text-white">
                    {module.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/52">
                    {module.copy}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function MemberArea() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const displayName = user?.name?.trim() || "Solution 會員";
  const [history, setHistory] = useState<PreviewHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = async () => {
    if (!isAuthenticated) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await listMemberPreviewHistory();
      setHistory(response.items);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "無法讀取預覽歷史。"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadHistory();
    } else {
      setHistory([]);
      setHistoryError("");
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0a] text-[#f3f4ee]">
      <MemberHeader isAuthenticated={isAuthenticated} name={displayName} />
      {loading ? (
        <main className="flex min-h-[65vh] items-center justify-center px-5">
          <div className="border-l border-[#a9ff44] pl-5">
            <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#a9ff44]">
              MEMBER ACCESS
            </p>
            <p className="mt-3 text-sm text-white/60">正在確認會員登入狀態…</p>
          </div>
        </main>
      ) : isAuthenticated ? (
        <MemberDashboard
          name={displayName}
          email={user?.email}
          onLogout={handleLogout}
          history={history}
          historyLoading={historyLoading}
          historyError={historyError}
          onRetryHistory={() => void loadHistory()}
        />
      ) : (
        <main>
          <MemberIntro />
          <section className="border-t border-white/10 bg-[#11130f] px-5 py-14 sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-7 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <FileClock
                  size={22}
                  strokeWidth={1.35}
                  className="text-[#a9ff44]"
                />
                <p className="max-w-2xl text-sm leading-6 text-white/58">
                  會員專區已預留給作品、配額與服務資訊；目前不會改變首頁 AI
                  預覽的操作方式。
                </p>
              </div>
              <button
                type="button"
                onClick={goHome}
                className="flex shrink-0 items-center gap-3 text-[0.65rem] font-bold tracking-[0.14em] text-white/65 transition-colors hover:text-[#a9ff44]"
              >
                瀏覽服務 <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </main>
      )}
      <footer className="border-t border-white/10 bg-[#090909] px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 text-[0.6rem] font-medium tracking-[0.13em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SOLUTION AUTOMOTIVE STUDIO</span>
          <span>MEMBER AREA · TAIWAN</span>
        </div>
      </footer>
    </div>
  );
}
