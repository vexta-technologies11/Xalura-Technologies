import type { Metadata } from "next";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import { getPageContent } from "@/lib/data";
import { getTeamMembers } from "@/lib/teamData";
import "./team-page.css";

export const metadata: Metadata = {
  title: "The Xalura team | Xalura Tech",
  description: "Meet the Xalura team.",
};

export default async function TeamPage() {
  const [pageContent, members] = await Promise.all([getPageContent(), getTeamMembers()]);

  return (
    <PublicPageShell footerContent={pageContent.footer} teamStrip={null}>
      <section className="wrap" style={{ paddingTop: 40, paddingBottom: 96 }}>
        <TeamPageClient teamPage={pageContent.teamPage} members={members} />
      </section>
    </PublicPageShell>
  );
}
