/**
 * Solution style reminder: use asymmetric automotive-editorial composition, material-led
 * photography, industrial index labels, sharp corner details, and titanium green only as a signal.
 */
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Cpu,
  Menu,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  SwatchBook,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import WrapColorPreview from "@/components/WrapColorPreview";

const services = [
  {
    number: "01",
    title: "汽車改色包膜",
    english: "VINYL WRAP",
    description: "從霧面、緞面到高光澤質感，讓車色成為你的風格語言，同時保留原廠車漆的完整性。",
    detail: "全車改色・局部改色・飾件包覆",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=88",
    icon: SwatchBook,
  },
  {
    number: "02",
    title: "透明保護膜",
    english: "PAINT PROTECTION FILM",
    description: "針對高衝擊區域與全車漆面建立透明防護層，減少日常飛石、刮痕與環境痕跡。",
    detail: "TPU 保護膜・高衝擊區域・全車防護",
    image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=88",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "精緻汽車美容",
    english: "DETAILING STUDIO",
    description: "以漆面校正、深層清潔與鍍膜保護，將車況回復到應有的乾淨、清晰與反光層次。",
    detail: "漆面校正・鍍膜保護・內裝深層清潔",
    image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1400&q=88",
    icon: Sparkles,
  },
];

const process = [
  ["01", "檢視", "確認車況、使用習慣與保護目標。"],
  ["02", "規劃", "依車型與預算建議施工範圍與材質。"],
  ["03", "施工", "在控溫、潔淨的工序中完成每一處細節。"],
  ["04", "交付", "說明養護方式，讓完成狀態持續更久。"],
];

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 28);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const navigateTo = (id: string) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0a] text-[#f3f4ee]">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-white/10 bg-[#0b0b0a]/92 py-3 backdrop-blur-xl" : "py-5"
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 lg:px-10">
          <button
            type="button"
            onClick={() => navigateTo("top")}
            className="group flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9ff44]"
            aria-label="回到首頁"
          >
            <img src="/manus-storage/solution-car-wrap-logo_01d39d4e.png" alt="Solution Car Wrap" className="h-auto w-[154px] object-contain object-left transition-transform duration-200 group-hover:scale-[1.025] group-active:scale-[0.98] sm:w-[174px]" />
          </button>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="主要導覽">
            {[
              ["服務項目", "services"],
              ["AI 車色預覽", "wrap-preview"],
              ["施工流程", "process"],
              ["關於 Solution", "about"],
            ].map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => navigateTo(id)}
                className="nav-link text-sm tracking-[0.08em] text-white/72 transition-colors hover:text-[#a9ff44] focus-visible:outline-none focus-visible:text-[#a9ff44]"
              >
                {label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => navigateTo("contact")}
            className="hidden items-center gap-3 border border-[#a9ff44] bg-[#a9ff44] px-4 py-2 text-xs font-bold tracking-[0.12em] text-[#10130a] transition-all duration-200 hover:bg-white hover:pr-3 active:scale-[0.97] lg:flex"
          >
            預約諮詢 <ArrowUpRight size={14} strokeWidth={2.3} />
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black/35 text-white lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "關閉選單" : "開啟選單"}
          >
            {menuOpen ? <X size={19} /> : <Menu size={20} />}
          </button>
        </div>

        <div className={`overflow-hidden border-t border-white/10 bg-[#0b0b0a] transition-[max-height] duration-300 lg:hidden ${menuOpen ? "max-h-80" : "max-h-0"}`}>
          <nav className="flex flex-col px-5 py-3" aria-label="行動版導覽">
            {[
              ["服務項目", "services"],
              ["AI 車色預覽", "wrap-preview"],
              ["施工流程", "process"],
              ["關於 Solution", "about"],
              ["預約諮詢", "contact"],
            ].map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => navigateTo(id)}
                className="flex items-center justify-between border-b border-white/10 py-4 text-left text-sm font-medium tracking-[0.08em] text-white/80 last:border-b-0"
              >
                {label} <ArrowUpRight size={16} className="text-[#a9ff44]" />
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="relative flex min-h-[760px] items-end overflow-hidden px-5 pb-10 pt-36 sm:px-8 lg:min-h-screen lg:px-10 lg:pb-14">
          <img
            src="/manus-storage/solution-hero-midnight_988e83e4.jpg"
            alt="深色跑車於專業施工空間中呈現車漆與保護膜的光澤"
            className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
          />
          <video
            className="hero-video absolute inset-0 h-full w-full object-cover object-[64%_center]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/manus-storage/solution-hero-midnight_988e83e4.jpg"
            aria-hidden="true"
          >
            <source src="/manus-storage/solution-hero-motion_bf43e9d1.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,6,0.95)_0%,rgba(7,8,7,0.78)_40%,rgba(7,8,7,0.18)_82%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,8,7,0.86)_0%,rgba(7,8,7,0)_52%)]" />
          <div className="hero-scan-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="hero-scan-line pointer-events-none absolute inset-x-0 top-[18%] h-px" aria-hidden="true" />
          <div className="hero-scan-edge pointer-events-none absolute inset-y-0 right-[18%] hidden w-px lg:block" aria-hidden="true" />
          <div className="technical-frame absolute inset-x-5 top-32 hidden h-[calc(100%-11rem)] border border-white/10 lg:inset-x-10 lg:block" />

          <div className="pointer-events-none absolute right-10 top-36 hidden w-52 border-l border-white/20 pl-4 lg:block" aria-hidden="true">
            <div className="flex items-center justify-between text-[0.57rem] font-semibold tracking-[0.17em] text-white/52"><span>LIVE SURFACE SCAN</span><span className="status-dot" /></div>
            <div className="mt-3 space-y-2 border-t border-white/12 pt-3 text-[0.54rem] font-medium tracking-[0.15em] text-white/38">
              <div className="flex justify-between"><span>FINISH</span><span>STABLE</span></div>
              <div className="flex justify-between"><span>REFLECTION</span><span>98.4%</span></div>
              <div className="flex justify-between"><span>FILM EDGE</span><span>CHECKED</span></div>
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col justify-end lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl pb-8 lg:pb-0">
              <div className="mb-6 flex items-center gap-3 text-[0.65rem] font-semibold tracking-[0.24em] text-[#a9ff44] animate-rise">
                <span className="h-px w-9 bg-[#a9ff44]" />
                SURFACE INSPECTION · PRECISION AUTO CARE
              </div>
              <h1 className="animate-rise delay-75 font-display max-w-4xl text-[clamp(3.65rem,9.5vw,9.8rem)] font-semibold uppercase leading-[0.78] tracking-[-0.055em] text-[#f5f6f0]">
                INSPECT THE
                <br />
                <span className="text-white/46">FINISH.</span>
              </h1>
              <p className="animate-rise delay-150 mt-7 max-w-md text-[0.98rem] leading-7 text-white/68 sm:text-base">
                先讀懂漆面狀態，再建立合適的防護。Solution 專注汽車包膜、透明保護膜與精緻美容。
              </p>
              <div className="animate-rise delay-200 mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigateTo("services")}
                  className="group flex items-center gap-5 bg-[#a9ff44] px-5 py-3.5 text-xs font-bold tracking-[0.13em] text-[#11130c] transition-all duration-200 hover:bg-[#f3f4ee] active:scale-[0.97]"
                >
                  探索服務
                  <span className="flex h-5 w-5 items-center justify-center border border-black/30 transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight size={12} strokeWidth={2.4} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("wrap-preview")}
                  className="text-xs font-medium tracking-[0.12em] text-white/70 underline decoration-white/35 underline-offset-4 transition-colors hover:text-white"
                >
                  線上預覽車色
                </button>
              </div>
            </div>

            <div className="flex w-full items-end justify-between border-t border-white/15 pt-5 lg:w-auto lg:min-w-80 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              <div>
                <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-white/40">READ EVERY PANEL FIRST</p>
                <p className="mt-2 text-sm text-white/80">從漆面狀態開始，再決定保護方式。</p>
              </div>
              <button type="button" onClick={() => navigateTo("services")} className="flex h-10 w-10 items-center justify-center border border-white/25 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]" aria-label="向下查看服務">
                <ArrowDown size={17} />
              </button>
            </div>
          </div>
        </section>

        <div className="fixed bottom-5 right-5 z-40 hidden md:block">
          <button type="button" onClick={() => navigateTo("wrap-preview")} className="group flex items-center gap-3 border border-[#a9ff44]/60 bg-[#10120c]/90 px-4 py-3 text-xs font-bold tracking-[0.11em] text-white shadow-2xl backdrop-blur-xl transition-colors hover:bg-[#a9ff44] hover:text-[#10120c] active:scale-[0.97]">
            <Cpu size={16} className="text-[#a9ff44] transition-colors group-hover:text-[#10120c]" /> AI 車色預覽 <ArrowUpRight size={14} />
          </button>
        </div>

        <section id="about" className="relative overflow-hidden border-y border-white/10 bg-[#10110e] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
          <div data-reveal className="relative mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-[0.95fr_1.6fr] lg:gap-24">
            <div>
              <p className="eyebrow">THE SOLUTION STANDARD</p>
              <div className="mt-7 max-w-xs border-l border-[#a9ff44] pl-5 text-sm leading-7 text-white/56">
                好的保護不只抵抗環境，也應該讓每一片鈑件看起來更像它原本該有的樣子。
              </div>
            </div>
            <div>
              <p className="font-display max-w-5xl text-[clamp(2.3rem,4.85vw,5.45rem)] font-medium uppercase leading-[0.91] tracking-[-0.04em] text-[#edf0e7]">
                PROTECTION STARTS
                <br />
                WITH <span className="text-[#a9ff44]">INSPECTION.</span>
              </p>
              <div className="mt-10 grid gap-7 border-t border-white/15 pt-6 sm:grid-cols-3">
                {[
                  ["MATERIAL", "挑選與車況相稱的膜料、塗層與工法。"],
                  ["PRECISION", "從邊角、收邊到反光，逐一確認完成度。"],
                  ["AFTERCARE", "施工完成後，提供清楚的日常養護建議。"],
                ].map(([label, copy]) => (
                  <div key={label}>
                    <p className="font-display text-base tracking-[0.08em] text-white/88">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <WrapColorPreview />

        <section id="services" className="relative overflow-hidden bg-[#0b0b0a] px-5 py-20 sm:px-8 lg:px-10 lg:py-32">
          <img src="/manus-storage/solution-car-wrap-logo_01d39d4e.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-20 top-52 w-[36rem] object-contain opacity-[0.035]" />
          <div data-reveal className="relative mx-auto max-w-[1600px]">
            <div className="mb-12 flex flex-col justify-between gap-6 border-b border-white/15 pb-7 md:flex-row md:items-end lg:mb-16">
              <div>
                <p className="eyebrow">SELECT YOUR PROTECTION</p>
                <h2 className="font-display mt-5 text-[clamp(3rem,6.4vw,7.35rem)] font-medium uppercase leading-[0.8] tracking-[-0.045em]">SERVICE<br />INDEX</h2>
              </div>
              <p className="max-w-sm text-sm leading-7 text-white/55">依照車況、停車環境與用車習慣，選擇最適合的防護與整理方案。</p>
            </div>

            <div className="flex flex-col gap-5">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article key={service.number} className={`service-card group relative min-h-[470px] overflow-hidden border border-white/12 bg-[#12130f] p-6 sm:p-8 md:min-h-[535px] ${service.number === "02" ? "md:ml-[13%]" : service.number === "03" ? "md:mr-[9%]" : "md:mr-[4%]"}`}>
                    <img src={service.image} alt={service.title} className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-[1.045]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,9,7,0.04)_17%,rgba(8,9,7,0.74)_73%,rgba(8,9,7,0.98)_100%)]" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="flex h-10 w-10 items-center justify-center border border-white/35 bg-black/25 text-xs font-semibold text-[#a9ff44] backdrop-blur-sm">{service.number}</span>
                        <Icon size={21} strokeWidth={1.5} className="text-white/85" />
                      </div>
                      <div>
                        <p className="mb-3 text-[0.62rem] font-semibold tracking-[0.22em] text-[#a9ff44]">{service.english}</p>
                        <h3 className="text-2xl font-bold tracking-[-0.025em] text-white sm:text-[1.7rem]">{service.title}</h3>
                        <p className="mt-4 max-w-sm text-sm leading-6 text-white/66">{service.description}</p>
                        <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
                          <span className="text-[0.64rem] font-medium tracking-[0.08em] text-white/55">{service.detail}</span>
                          <button type="button" onClick={() => navigateTo("contact")} className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#a9ff44]/65 text-[#a9ff44] transition-colors hover:bg-[#a9ff44] hover:text-black" aria-label={`諮詢${service.title}`}>
                            <ArrowUpRight size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="process" className="relative overflow-hidden border-y border-white/10 bg-[#cfd1cb] px-5 py-20 text-[#11130e] sm:px-8 lg:px-10 lg:py-28">
          <div className="pointer-events-none absolute inset-x-5 top-6 border-t border-[#3e483c]/35 sm:inset-x-8 lg:inset-x-10" />
          <div data-reveal className="relative mx-auto max-w-[1600px]">
            <div className="grid gap-8 border-b border-black/20 pb-10 md:grid-cols-[0.75fr_1.35fr] md:items-end">
              <div>
                <p className="eyebrow !text-[#4e5740]">FROM FIRST LOOK TO FINAL LIGHT</p>
              </div>
              <div>
                <h2 className="font-display text-[clamp(3rem,6vw,7rem)] font-medium uppercase leading-[0.82] tracking-[-0.045em]">BEFORE<br />THE FINISH.</h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-black/58">從去除表面污染、確認漆面缺陷，到膜料收邊與交車後養護，每一個環節都會留下應有的完成狀態。</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {process.map(([number, title, copy]) => (
                <div key={number} className="group border-b border-black/20 py-8 pr-7 sm:border-r sm:px-6 sm:first:pl-0 lg:min-h-64 lg:border-b-0 lg:py-10 lg:first:pl-0 lg:last:border-r-0">
                  <p className="font-display text-sm tracking-[0.1em] text-[#56732d]">{number}</p>
                  <h3 className="mt-12 text-xl font-bold tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 max-w-[15rem] text-sm leading-6 text-black/58">{copy}</p>
                  <span className="mt-6 flex h-7 w-7 items-center justify-center border border-black/25 transition-all duration-200 group-hover:translate-x-1 group-hover:border-[#4c6b24] group-hover:bg-[#4c6b24] group-hover:text-white"><ArrowRight size={14} /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#10110e] px-5 py-20 sm:px-8 lg:px-10 lg:py-32">
          <div className="grain pointer-events-none absolute inset-0" />
          <div data-reveal className="relative mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <div className="border-l border-[#a9ff44] pl-6 lg:pl-8">
              <p className="eyebrow">DESIGNED FOR DAILY REALITY</p>
              <h2 className="font-display mt-7 max-w-2xl text-[clamp(3rem,6.25vw,7rem)] font-medium uppercase leading-[0.82] tracking-[-0.048em]">AFTERCARE<br /><span className="text-white/42">PRESERVES</span><br />THE FINISH.</h2>
            </div>
            <div className="lg:pl-16">
              <p className="max-w-xl text-xl leading-9 text-white/78 sm:text-2xl sm:leading-10">施工結束後，透過正確洗車、乾燥與養護週期，讓膜面與漆面的光澤維持在你期待的狀態。</p>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 text-[0.67rem] font-semibold tracking-[0.15em] text-white/48">
                {["QUALIFIED MATERIALS", "CONTROLLED WORKFLOW", "CARE GUIDANCE"].map((item) => (
                  <span key={item} className="flex items-center gap-2"><Check size={14} className="text-[#a9ff44]" /> {item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="relative overflow-hidden border-t border-[#a9ff44] bg-[#1a1c17] px-5 py-20 text-[#edf0e7] sm:px-8 lg:px-10 lg:py-24">
          <img src="/manus-storage/solution-car-wrap-logo_01d39d4e.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-16 -top-2 w-[34rem] object-contain opacity-[0.08]" />
          <div data-reveal className="relative mx-auto flex max-w-[1600px] flex-col justify-between gap-12 lg:flex-row lg:items-end">
            <div>
              <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#a9ff44]">SCHEDULE A SURFACE REVIEW</p>
              <h2 className="font-display mt-6 max-w-3xl text-[clamp(3.3rem,7.1vw,8.4rem)] font-semibold uppercase leading-[0.79] tracking-[-0.055em]">CHECK THE<br /><span className="text-white/44">FINISH</span><br />FIRST.</h2>
            </div>
            <div className="max-w-md border-t border-white/20 pt-6 lg:mb-2">
              <p className="text-base leading-7 text-white/66">告訴我們車型、漆面狀態與停車情境。從保護範圍、膜料選擇到交車後養護，我們會先完成一份清楚的施工建議。</p>
              <button type="button" onClick={() => toast("預約管道待補上", { description: "提供電話、LINE 或預約網址後，即可連結至正式諮詢流程。" })} className="mt-8 flex items-center gap-4 bg-[#a9ff44] px-5 py-4 text-xs font-bold tracking-[0.12em] text-[#11130c] transition-all duration-200 hover:bg-white hover:text-black active:scale-[0.97]">
                預約車況檢視 <MoveUpRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0b0b0a] px-5 pt-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-col justify-between gap-8 border-b border-white/12 pb-12 md:flex-row md:items-end">
            <img src="/manus-storage/solution-car-wrap-logo_01d39d4e.png" alt="Solution Car Wrap" className="h-auto w-56 max-w-full object-contain object-left sm:w-64" />
            <p className="max-w-sm text-sm leading-6 text-white/45">汽車包膜・透明保護膜・精緻汽車美容<br />地點與正式預約資訊可於上線前依您的店址補上。</p>
          </div>
          <div className="flex flex-col gap-3 py-5 text-[0.63rem] font-medium tracking-[0.12em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 SOLUTION AUTOMOTIVE STUDIO</span>
            <span>CRAFTED WITH INTENT · TAIWAN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
