/**
 * Solution style reminder: a contemporary automotive editorial interface in graphite,
 * mist silver, and restrained titanium green; preserve the calm, engineered character.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArrowUpRight } from "lucide-react";
import { Route, Switch, useLocation } from "wouter";
import AdminMembers from "@/pages/AdminMembers";
import AdminContent from "@/pages/AdminContent";
import Home from "@/pages/Home";
import MemberArea from "@/pages/MemberArea";
import MemberVehicleStudio from "@/pages/MemberVehicleStudio";
import {
  AboutPage,
  AiColorPage,
  BlogDetailPage,
  BlogPage,
  ContactPage,
  NotFoundPage,
  ProcessPage,
  ServicesPage,
} from "@/pages/SitePages";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { LineContact } from "@/components/LineContact";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";

function MemberAreaRoute() {
  useEffect(() => {
    const enhanceVehicleStudioCard = () => {
      const card = Array.from(
        document.querySelectorAll<HTMLElement>(
          "main div.relative.flex.min-h-64"
        )
      ).find(candidate => {
        const text = candidate.textContent?.replace(/\s+/g, " ") || "";
        return (
          text.includes("360°") &&
          text.includes("展示專案") &&
          text.includes("準備中")
        );
      });
      if (!card) return;
      const badge = card.querySelector<HTMLElement>("span.absolute");
      if (badge) badge.textContent = "Beta測試";
      const label = Array.from(card.querySelectorAll("p")).find(node =>
        node.textContent?.includes("UP NEXT")
      );
      if (label) label.textContent = "OPEN NOW";
      if (card.dataset.solution360Linked === "true") return;
      card.dataset.solution360Linked = "true";
      card.style.cursor = "pointer";
      card.setAttribute("aria-label", "開啟 360° 車輛工作室");
      const link = document.createElement("a");
      link.href = "/member/vehicle-studio";
      link.setAttribute("aria-label", "開啟 360° 車輛工作室");
      link.className = "absolute inset-0 z-10";
      card.prepend(link);
    };
    enhanceVehicleStudioCard();
    const observer = new MutationObserver(enhanceVehicleStudioCard);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <MemberArea />
      <a
        href="/member/vehicle-studio"
        aria-label="開啟 360° 車輛工作室"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 border border-[#a9ff44]/70 bg-[#a9ff44] px-4 py-3 text-[0.65rem] font-extrabold tracking-[0.11em] text-[#10130a] shadow-[0_12px_36px_rgba(0,0,0,0.28)] transition-transform hover:-translate-y-0.5 sm:bottom-7 sm:right-7"
      >
        360° 車輛工作室 <ArrowUpRight size={16} />
      </a>
    </>
  );
}

function PublicSite() {
  return (
    <>
      <SiteHeader />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/ai-color" component={AiColorPage} />
        <Route path="/process" component={ProcessPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/blog/:slug" component={BlogDetailPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route component={NotFoundPage} />
      </Switch>
      <SiteFooter />
    </>
  );
}

function GlobalLineContact() {
  const [location] = useLocation();
  if (location.startsWith("/admin/")) return null;

  return (
    <LineContact
      floating
      floatingBottom={
        location === "/member"
          ? "max(5.75rem, env(safe-area-inset-bottom))"
          : undefined
      }
    />
  );
}

function Router() {
  return (
    <SiteContentProvider>
      <GlobalLineContact />
      <Switch>
        <Route path="/member/vehicle-studio" component={MemberVehicleStudio} />
        <Route path="/member" component={MemberAreaRoute} />
        <Route path="/admin/members" component={AdminMembers} />
        <Route path="/admin/content" component={AdminContent} />
        <Route component={PublicSite} />
      </Switch>
    </SiteContentProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
export default App;
