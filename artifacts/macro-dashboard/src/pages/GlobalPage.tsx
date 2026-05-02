import { TabComingSoon } from "@/components/TabComingSoon";

export default function GlobalPage() {
  return (
    <TabComingSoon
      title="Global Macro"
      description="International economic indicators from major economies. Coming in the next build — will include EU, UK, China, Japan, and emerging market data from public statistical agencies."
      items={[
        "Eurozone: GDP, CPI, ECB Rate (Eurostat)",
        "UK: GDP, CPI, BoE Rate (ONS)",
        "China: PMI, Trade Balance, GDP (NBS)",
        "Japan: GDP, CPI, BoJ Policy (MIC)",
        "Global PMI Composite",
        "USD Index & DXY",
        "Emerging Market Capital Flows",
      ]}
    />
  );
}
