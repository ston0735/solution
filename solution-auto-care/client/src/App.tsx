/**
 * Solution style reminder: a contemporary automotive editorial interface in graphite,
 * mist silver, and restrained titanium green; preserve the calm, engineered character.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArrowUpRight } from "lucide-react";
import NotFound from "@/pages/NotFound";
import AdminMembers from "@/pages/AdminMembers";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MemberArea from "./pages/MemberArea";
import MemberVehicleStudio from "./pages/MemberVehicleStudio";

function MemberAreaRoute() {
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/member" component={MemberAreaRoute} />
      <Route path="/member/vehicle-studio" component={MemberVehicleStudio} />
      <Route path="/admin/members" component={AdminMembers} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
