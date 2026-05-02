import { useState, Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BarChart2 } from "lucide-react";

const OverviewPage    = lazy(() => import("@/pages/OverviewPage"));
const GrowthPage      = lazy(() => import("@/pages/GrowthPage"));
const InflationPage   = lazy(() => import("@/pages/InflationPage"));
const LaborPage       = lazy(() => import("@/pages/LaborPage"));
const FinancialPage   = lazy(() => import("@/pages/FinancialPage"));
const GlobalPage      = lazy(() => import("@/pages/GlobalPage"));
const InvestorGuidePage = lazy(() => import("@/pages/InvestorGuidePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center animate-pulse">
          <BarChart2 className="h-4 w-4 text-white" />
        </div>
        <p className="text-sm text-zinc-500 animate-pulse">Loading data…</p>
      </div>
    </div>
  );
}

function ActivePage({ tab }: { tab: string }) {
  switch (tab) {
    case "overview":  return <OverviewPage />;
    case "growth":    return <GrowthPage />;
    case "inflation": return <InflationPage />;
    case "labor":     return <LaborPage />;
    case "financial": return <FinancialPage />;
    case "global":    return <GlobalPage />;
    case "investor":  return <InvestorGuidePage />;
    default:          return <OverviewPage />;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return ["overview","growth","inflation","labor","financial","global","investor"].includes(hash) ? hash : "overview";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
          <Suspense fallback={<PageLoader />}>
            <ActivePage tab={activeTab} />
          </Suspense>
        </DashboardLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
