import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSiteContent } from "@/contexts/SiteContentContext";

const links = [
  ["nav.ai", "/ai-color"],
  ["nav.process", "/process"],
  ["nav.blog", "/blog"],
  ["nav.about", "/about"],
  ["nav.contact", "/contact"],
] as const;
export default function SiteHeader() {
  const { text, image, preview } = useSiteContent();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 28);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [location]);
  const previewQuery = preview ? "?cms-preview=1" : "";
  const href = (path: string) => `${path}${previewQuery}`;
  const serviceLinks = [0, 1, 2].map(index => ({
    title: text(`services.${index}.title`),
    href: `${href("/services")}#service-${index}`,
  }));
  return (
    <>
      {preview && (
        <div className="fixed inset-x-0 top-0 z-[70] flex justify-center gap-4 bg-amber-300 px-4 py-2 text-xs font-bold text-black">
          {text("global.previewBannerLabel")}
          <a href="/admin/content" className="underline">
            {text("global.previewReturnLabel")}
          </a>
        </div>
      )}
      <header
        className={`fixed inset-x-0 ${preview ? "top-8" : "top-0"} z-50 border-b transition-all duration-300 ${scrolled || location !== "/" || open ? "border-white/10 bg-[#0b0b0a]/95 py-3 backdrop-blur-xl" : "border-transparent bg-black/20 py-5"}`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 lg:px-10">
          <Link
            href={href("/")}
            aria-label={text("global.logoButtonAria")}
            className="shrink-0"
          >
            <img
              src={image("global.logo")}
              alt={text("global.logoAlt")}
              className="h-auto w-[145px] object-contain sm:w-[164px]"
            />
          </Link>
          <nav
            className="hidden items-center gap-5 xl:gap-7 lg:flex"
            aria-label={text("global.mainNavAria")}
          >
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setServicesOpen(false);
              }}
              onKeyDown={event => {
                if (event.key === "Escape") setServicesOpen(false);
              }}
            >
              <div className="flex items-center">
                <Link
                  href={href("/services")}
                  className="nav-link py-3 text-sm text-white/80 hover:text-[#a9ff44]"
                >
                  {text("nav.services")}
                </Link>
                <button
                  className="ml-1 p-1 text-white/70 hover:text-[#a9ff44]"
                  aria-label={text("global.servicesMenuToggle")}
                  aria-expanded={servicesOpen}
                  aria-controls="desktop-services"
                  onClick={() => setServicesOpen(value => !value)}
                  onFocus={() => setServicesOpen(true)}
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${servicesOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              {servicesOpen && (
                <div
                  id="desktop-services"
                  className="absolute left-0 top-full w-60 border border-white/15 bg-[#141611] p-2 shadow-2xl"
                >
                  {serviceLinks.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between px-4 py-4 text-sm text-white/75 hover:bg-white/5 hover:text-[#a9ff44]"
                      onClick={() => setServicesOpen(false)}
                    >
                      {item.title}
                      <ArrowUpRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {links.map(([key, path]) => (
              <Link
                key={key}
                href={href(path)}
                className={
                  key === "nav.contact"
                    ? "inline-flex items-center gap-2 border border-[#a9ff44] bg-[#a9ff44] px-4 py-2.5 text-xs font-bold text-[#10130a] transition-colors hover:bg-white"
                    : `nav-link whitespace-nowrap py-3 text-sm transition-colors ${location === path ? "text-[#a9ff44]" : "text-white/75 hover:text-[#a9ff44]"}`
                }
              >
                {text(key === "nav.contact" ? "global.headerBookingCta" : key)}
                {key === "nav.contact" && <ArrowUpRight size={14} />}
              </Link>
            ))}
          </nav>
          <Link
            href="/member"
            className="hidden items-center gap-2 border-l border-white/20 pl-4 text-xs text-white/65 hover:text-[#a9ff44] lg:flex"
            aria-label={text("global.memberLabel")}
          >
            <UserRound size={16} />
            <span className="max-w-20 truncate">
              {authLoading
                ? text("global.memberLoadingLabel")
                : isAuthenticated
                  ? user?.name || text("nav.member")
                  : text("global.memberLabel")}
            </span>
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-white/20 text-white lg:hidden"
            onClick={() => setOpen(value => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={text(
              open ? "global.menuCloseAria" : "global.menuOpenAria"
            )}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="max-h-[calc(100dvh-100px)] overflow-y-auto border-t border-white/10 bg-[#0b0b0a] px-5 pb-5 pt-2 lg:hidden"
            aria-label={text("global.mobileNavAria")}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-white/10 py-4 text-left text-sm text-white/85"
              aria-expanded={servicesOpen}
              aria-controls="mobile-services"
              onClick={() => setServicesOpen(value => !value)}
            >
              {text("nav.services")}
              <ChevronDown
                size={16}
                className={servicesOpen ? "rotate-180" : ""}
              />
            </button>
            {servicesOpen && (
              <div
                id="mobile-services"
                className="border-l border-[#a9ff44]/60 pl-4"
              >
                <Link
                  href={href("/services")}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm text-[#a9ff44]"
                >
                  {text("global.servicesAllLabel")}
                </Link>
                {serviceLinks.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-sm text-white/70"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
            {links.map(([key, path]) => (
              <Link
                key={key}
                href={href(path)}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-white/10 py-4 text-sm text-white/80"
              >
                {text(key)}
                <ArrowUpRight size={15} className="text-[#a9ff44]" />
              </Link>
            ))}
            <Link
              href="/member"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center gap-2 text-xs text-[#a9ff44]"
            >
              <UserRound size={15} />
              {text("nav.member")}
              {isAuthenticated && ` · ${user?.name || "已登入"}`}
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
