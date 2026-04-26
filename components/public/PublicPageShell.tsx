import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { StarfieldBackground } from "./StarfieldBackground";
import type { PageContentMap } from "@/types/content";
import type { TeamMemberRow } from "@/types/team";
import "@/app/public-palantir.css";
import "@/app/home-starfield.css";

type Props = {
  children: React.ReactNode;
  footerContent: PageContentMap["footer"];
  /** Optional team preview for footer (e.g. pass from a server page with `getTeamMembers`). */
  teamStrip?: { teamPage: PageContentMap["teamPage"]; members: TeamMemberRow[] } | null;
  /**
   * Starfield + Palantir nav/footer. Set false for dashboard (light page).
   * @default true
   */
  starfield?: boolean;
};

export function PublicPageShell({
  children,
  footerContent,
  teamStrip,
  starfield = true,
}: Props) {
  if (!starfield) {
    return (
      <>
        <Nav />
        <div className="public-page">{children}</div>
        <Footer content={footerContent} teamStrip={teamStrip} />
      </>
    );
  }

  return (
    <main className="public-home--palantir public-home--starfield public-starfield-route">
      <StarfieldBackground />
      <div className="public-home__layers">
        <Nav variant="palantir" />
        <div className="public-page public-page--starfield">{children}</div>
        <Footer content={footerContent} className="footer--ph" teamStrip={teamStrip} />
      </div>
    </main>
  );
}
