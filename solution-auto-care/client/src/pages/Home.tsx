import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Sparkles,
  SwatchBook,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import WrapColorPreview from "@/components/WrapColorPreview";
import { useSiteContent } from "@/contexts/SiteContentContext";

export default function Home() {
  const { text, image } = useSiteContent();
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach(target => target.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const services = [0, 1, 2].map(index => ({
    number: text(`services.${index}.number`),
    title: text(`services.${index}.title`),
    english: text(`services.${index}.english`),
    description: text(`services.${index}.description`),
    detail: text(`services.${index}.detail`),
    image: text(`services.${index}.image`),
    imageAlt: text(`services.${index}.imageAlt`),
    aria: text(`services.${index}.ctaAriaLabel`),
    Icon: [SwatchBook, ShieldCheck, Sparkles][index],
  }));
  const process = [0, 1, 2, 3].map(index => ({
    number: text(`process.${index}.number`),
    title: text(`process.${index}.title`),
    description: text(`process.${index}.description`),
  }));
  const scrollToServices = () =>
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main
      id="top"
      className="min-h-screen overflow-hidden bg-[#0b0b0a] text-[#f3f4ee]"
    >
      <section className="relative flex min-h-[760px] items-end overflow-hidden px-5 pb-10 pt-36 sm:px-8 lg:min-h-screen lg:px-10 lg:pb-14">
        <img
          src={image("home.hero.image")}
          alt={text("home.hero.imageAlt")}
          className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,6,0.95)_0%,rgba(7,8,7,0.78)_40%,rgba(7,8,7,0.18)_82%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,8,7,0.86)_0%,rgba(7,8,7,0)_52%)]" />
        <div
          className="hero-scan-grid pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div
          className="hero-scan-line pointer-events-none absolute inset-x-0 top-[18%] h-px"
          aria-hidden="true"
        />
        <div
          className="hero-scan-edge pointer-events-none absolute inset-y-0 right-[18%] hidden w-px lg:block"
          aria-hidden="true"
        />
        <div className="technical-frame absolute inset-x-5 top-32 hidden h-[calc(100%-11rem)] border border-white/10 lg:inset-x-10 lg:block" />
        <div
          className="pointer-events-none absolute right-10 top-36 hidden w-52 border-l border-white/20 pl-4 lg:block"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between text-[0.57rem] font-semibold tracking-[0.17em] text-white/52">
            <span>{text("home.hero.scanLabel")}</span>
            <span className="status-dot" />
          </div>
          <div className="mt-3 space-y-2 border-t border-white/12 pt-3 text-[0.54rem] font-medium tracking-[0.15em] text-white/38">
            <div className="flex justify-between">
              <span>{text("home.hero.finishLabel")}</span>
              <span>{text("home.hero.finishValue")}</span>
            </div>
            <div className="flex justify-between">
              <span>{text("home.hero.reflectionLabel")}</span>
              <span>{text("home.hero.reflectionValue")}</span>
            </div>
            <div className="flex justify-between">
              <span>{text("home.hero.edgeLabel")}</span>
              <span>{text("home.hero.edgeValue")}</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col justify-end lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl pb-8 lg:pb-0">
            <div className="mb-6 flex items-center gap-3 text-[0.65rem] font-semibold tracking-[0.24em] text-[#a9ff44] animate-rise">
              <span className="h-px w-9 bg-[#a9ff44]" />
              {text("home.hero.eyebrow")}
            </div>
            <h1 className="animate-rise delay-75 font-display max-w-4xl text-[clamp(3.65rem,9.5vw,9.8rem)] font-semibold uppercase leading-[0.78] tracking-[-0.055em] text-[#f5f6f0]">
              {text("home.hero.titleLine1")}
              <br />
              <span className="text-white/46">
                {text("home.hero.titleLine2")}
              </span>
            </h1>
            <p className="animate-rise delay-150 mt-7 max-w-md whitespace-pre-line text-[0.98rem] leading-7 text-white/68 sm:text-base">
              {text("home.hero.description")}
            </p>
            <div className="animate-rise delay-200 mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/services"
                className="group flex items-center gap-5 bg-[#a9ff44] px-5 py-3.5 text-xs font-bold tracking-[0.13em] text-[#11130c] transition-all hover:bg-[#f3f4ee]"
              >
                {text("home.hero.primaryCta")}
                <span className="flex h-5 w-5 items-center justify-center border border-black/30 transition-transform group-hover:translate-x-1">
                  <ArrowRight size={12} />
                </span>
              </Link>
              <Link
                href="/ai-color"
                className="text-xs font-medium tracking-[0.12em] text-white/70 underline decoration-white/35 underline-offset-4 transition-colors hover:text-white"
              >
                {text("home.hero.secondaryCta")}
              </Link>
            </div>
          </div>
          <div className="flex w-full items-end justify-between border-t border-white/15 pt-5 lg:w-auto lg:min-w-80 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-white/40">
                {text("home.hero.panelEyebrow")}
              </p>
              <p className="mt-2 text-sm text-white/80">
                {text("home.hero.panelCopy")}
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToServices}
              className="flex h-10 w-10 items-center justify-center border border-white/25 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
              aria-label={text("home.hero.scrollAria")}
            >
              <ArrowDown size={17} />
            </button>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="relative overflow-hidden border-y border-white/10 bg-[#10110e] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      >
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
        <div
          data-reveal
          className="relative mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-[0.95fr_1.6fr] lg:gap-24"
        >
          <div>
            <p className="eyebrow">{text("about.eyebrow")}</p>
            <div className="mt-7 max-w-xs whitespace-pre-line border-l border-[#a9ff44] pl-5 text-sm leading-7 text-white/56">
              {text("about.intro")}
            </div>
          </div>
          <div>
            <p className="font-display max-w-5xl text-[clamp(2.3rem,4.85vw,5.45rem)] font-medium uppercase leading-[0.91] tracking-[-0.04em] text-[#edf0e7]">
              {text("about.titleLine1")}
              <br />
              {text("about.titleLine2")}{" "}
              <span className="text-[#a9ff44]">
                {text("about.titleAccent")}
              </span>
            </p>
            <div className="mt-10 grid gap-7 border-t border-white/15 pt-6 sm:grid-cols-3">
              {[0, 1, 2].map(index => (
                <div key={index}>
                  <p className="font-display text-base tracking-[0.08em] text-white/88">
                    {text(`about.value.${index}.label`)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {text(`about.value.${index}.copy`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        className="relative overflow-hidden bg-[#0b0b0a] px-5 py-20 sm:px-8 lg:px-10 lg:py-32"
      >
        <img
          src={image("global.logo")}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-52 w-[36rem] object-contain opacity-[0.035]"
        />
        <div data-reveal className="relative mx-auto max-w-[1600px]">
          <div className="mb-12 flex flex-col justify-between gap-6 border-b border-white/15 pb-7 md:flex-row md:items-end lg:mb-16">
            <div>
              <p className="eyebrow">{text("services.eyebrow")}</p>
              <h2 className="font-display mt-5 text-[clamp(3rem,6.4vw,7.35rem)] font-medium uppercase leading-[0.8] tracking-[-0.045em]">
                {text("services.titleLine1")}
                <br />
                {text("services.titleLine2")}
              </h2>
            </div>
            <p className="max-w-sm whitespace-pre-line text-sm leading-7 text-white/55">
              {text("services.description")}
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {services.map((service, index) => {
              const Icon = service.Icon;
              return (
                <article
                  id={`service-${index}`}
                  key={service.number}
                  className={`service-card group relative min-h-[470px] scroll-mt-28 overflow-hidden border border-white/12 bg-[#12130f] p-6 sm:p-8 md:min-h-[535px] ${index === 1 ? "md:ml-[13%]" : index === 2 ? "md:mr-[9%]" : "md:mr-[4%]"}`}
                >
                  <img
                    src={service.image}
                    alt={service.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-[1.045]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,9,7,0.04)_17%,rgba(8,9,7,0.74)_73%,rgba(8,9,7,0.98)_100%)]" />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center border border-white/35 bg-black/25 text-xs font-semibold text-[#a9ff44] backdrop-blur-sm">
                        {service.number}
                      </span>
                      <Icon
                        size={21}
                        strokeWidth={1.5}
                        className="text-white/85"
                      />
                    </div>
                    <div>
                      <p className="mb-3 text-[0.62rem] font-semibold tracking-[0.22em] text-[#a9ff44]">
                        {service.english}
                      </p>
                      <h3 className="text-2xl font-bold tracking-[-0.025em] text-white sm:text-[1.7rem]">
                        {service.title}
                      </h3>
                      <p className="mt-4 max-w-sm text-sm leading-6 text-white/66">
                        {service.description}
                      </p>
                      <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
                        <span className="text-[0.64rem] font-medium tracking-[0.08em] text-white/55">
                          {service.detail}
                        </span>
                        <Link
                          href="/contact"
                          aria-label={service.aria}
                          className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#a9ff44]/65 text-[#a9ff44] transition-colors hover:bg-[#a9ff44] hover:text-black"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-9 text-right">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-sm text-[#a9ff44] hover:text-white"
            >
              {text("home.servicesLinkCta")} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <WrapColorPreview />

      <section
        id="process"
        className="relative overflow-hidden border-y border-white/10 bg-[#cfd1cb] px-5 py-20 text-[#11130e] sm:px-8 lg:px-10 lg:py-28"
      >
        <div className="pointer-events-none absolute inset-x-5 top-6 border-t border-[#3e483c]/35 sm:inset-x-8 lg:inset-x-10" />
        <div data-reveal className="relative mx-auto max-w-[1600px]">
          <div className="grid gap-8 border-b border-black/20 pb-10 md:grid-cols-[0.75fr_1.35fr] md:items-end">
            <div>
              <p className="eyebrow !text-[#4e5740]">
                {text("process.eyebrow")}
              </p>
            </div>
            <div>
              <h2 className="font-display text-[clamp(3rem,6vw,7rem)] font-medium uppercase leading-[0.82] tracking-[-0.045em]">
                {text("process.titleLine1")}
                <br />
                {text("process.titleLine2")}
              </h2>
              <p className="mt-5 max-w-md whitespace-pre-line text-sm leading-6 text-black/58">
                {text("process.description")}
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {process.map(step => (
              <div
                key={step.number}
                className="group border-b border-black/20 py-8 pr-7 sm:border-r sm:px-6 sm:first:pl-0 lg:min-h-64 lg:border-b-0 lg:py-10 lg:first:pl-0 lg:last:border-r-0"
              >
                <p className="font-display text-sm tracking-[0.1em] text-[#56732d]">
                  {step.number}
                </p>
                <h3 className="mt-12 text-xl font-bold tracking-[-0.03em]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[15rem] text-sm leading-6 text-black/58">
                  {step.description}
                </p>
                <span className="mt-6 flex h-7 w-7 items-center justify-center border border-black/25 transition-all group-hover:translate-x-1 group-hover:border-[#4c6b24] group-hover:bg-[#4c6b24] group-hover:text-white">
                  <ArrowRight size={14} />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-7 text-right">
            <Link
              href="/process"
              className="inline-flex items-center gap-2 text-sm text-[#24331a] hover:text-black"
            >
              {text("home.processLinkCta")} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#10110e] px-5 py-20 sm:px-8 lg:px-10 lg:py-32">
        <div className="grain pointer-events-none absolute inset-0" />
        <div
          data-reveal
          className="relative mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end"
        >
          <div className="border-l border-[#a9ff44] pl-6 lg:pl-8">
            <p className="eyebrow">{text("aftercare.eyebrow")}</p>
            <h2 className="font-display mt-7 max-w-2xl text-[clamp(3rem,6.25vw,7rem)] font-medium uppercase leading-[0.82] tracking-[-0.048em]">
              {text("aftercare.titleLine1")}
              <br />
              <span className="text-white/42">
                {text("aftercare.titleLine2")}
              </span>
              <br />
              {text("aftercare.titleLine3")}
            </h2>
          </div>
          <div className="lg:pl-16">
            <p className="max-w-xl whitespace-pre-line text-xl leading-9 text-white/78 sm:text-2xl sm:leading-10">
              {text("aftercare.description")}
            </p>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 text-[0.67rem] font-semibold tracking-[0.15em] text-white/48">
              {[0, 1, 2].map(index => (
                <span key={index} className="flex items-center gap-2">
                  <Check size={14} className="text-[#a9ff44]" />
                  {text(`aftercare.badge.${index}.label`)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="relative overflow-hidden border-t border-[#a9ff44] bg-[#1a1c17] px-5 py-20 text-[#edf0e7] sm:px-8 lg:px-10 lg:py-24"
      >
        <img
          src={image("global.logo")}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-2 w-[34rem] object-contain opacity-[0.08]"
        />
        <div
          data-reveal
          className="relative mx-auto flex max-w-[1600px] flex-col justify-between gap-12 lg:flex-row lg:items-end"
        >
          <div>
            <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#a9ff44]">
              {text("contact.eyebrow")}
            </p>
            <h2 className="font-display mt-6 max-w-3xl text-[clamp(3.3rem,7.1vw,8.4rem)] font-semibold uppercase leading-[0.79] tracking-[-0.055em]">
              {text("contact.titleLine1")}
              <br />
              <span className="text-white/44">
                {text("contact.titleLine2")}
              </span>
              <br />
              {text("contact.titleLine3")}
            </h2>
          </div>
          <div className="max-w-md border-t border-white/20 pt-6 lg:mb-2">
            <p className="whitespace-pre-line text-base leading-7 text-white/66">
              {text("contact.description")}
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex items-center gap-3 border border-white/25 px-5 py-3 text-xs font-bold tracking-[0.12em] text-white/85 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
            >
              {text("contact.primaryCta")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
