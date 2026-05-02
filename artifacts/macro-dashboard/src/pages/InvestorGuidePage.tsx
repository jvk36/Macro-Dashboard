import { TabComingSoon } from "@/components/TabComingSoon";

export default function InvestorGuidePage() {
  return (
    <TabComingSoon
      title="Investor Guide"
      description="Actionable asset allocation guidance based on the current macro regime. Will synthesize all indicators into practical investment implications across asset classes."
      items={[
        "Asset Class Performance by Cycle Phase",
        "Sector Rotation Guide",
        "Duration Risk Scorecard",
        "Equity vs. Bond vs. Cash Positioning",
        "Recession Playbook",
        "Inflation Hedge Guide",
        "Historical Regime Analysis",
      ]}
    />
  );
}
