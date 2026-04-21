import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { HeroBanner } from "@/modules/dashboard/components/hero-banner";
import { KpiRow } from "@/modules/dashboard/components/kpi-row";
import { ReferralCard } from "@/modules/dashboard/components/referral-card";
import { MilestoneProgress } from "@/modules/dashboard/components/milestone-progress";
import { RecentMaterials } from "@/modules/dashboard/components/recent-materials";
import { TwitterFeed } from "@/modules/dashboard/components/twitter-feed";

export default function DashboardPage() {
  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        <HeroBanner />
        <KpiRow />
        <ReferralCard />
        <MilestoneProgress />
        <RecentMaterials />
        <TwitterFeed />
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
