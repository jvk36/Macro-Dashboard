import { cn } from "@/lib/utils";
import { BarChart2, TrendingUp, Flame, Users, Activity, Globe, BookOpen } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const TABS: Tab[] = [
  { id: "overview",   label: "Overview",             shortLabel: "Overview",   icon: BarChart2  },
  { id: "growth",     label: "Growth & Cycle",        shortLabel: "Growth",     icon: TrendingUp },
  { id: "inflation",  label: "Inflation",             shortLabel: "Inflation",  icon: Flame      },
  { id: "labor",      label: "Labor Market",          shortLabel: "Labor",      icon: Users      },
  { id: "financial",  label: "Financial Conditions",  shortLabel: "Financial",  icon: Activity   },
  { id: "global",     label: "Global",                shortLabel: "Global",     icon: Globe,     badge: "Soon" },
  { id: "investor",   label: "Investor Guide",        shortLabel: "Guide",      icon: BookOpen,  badge: "Soon" },
];

interface DashboardLayoutProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}

export function DashboardLayout({ activeTab, onTabChange, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <BarChart2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-zinc-100 hidden sm:block">MacroDash</span>
              <span className="text-xs text-zinc-600 hidden sm:block">for DIY Investors</span>
            </div>

            <div className="w-px h-5 bg-zinc-800 hidden sm:block" />

            {/* Tab nav — scrollable on mobile */}
            <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all relative",
                      isActive
                        ? "bg-blue-600/20 text-blue-400 font-medium"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.shortLabel}</span>
                    {tab.badge && (
                      <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded px-1 py-0.5 ml-0.5 hidden md:inline">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
