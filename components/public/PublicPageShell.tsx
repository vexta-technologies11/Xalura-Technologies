import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { StarfieldBackground } from "./StarfieldBackground";
import type { PageContentMap } from "@/types/content";
import "@/app/public-palantir.css";
import "@/app/home-starfield.css";

type Props = {
  children: React.ReactNode;
  footerContent: PageContentMap["footer"];
  /**
   * Starfield + Palantir nav/footer. Set false for dashboard (light page).
   * @default true
   */
  starfield?: boolean;
};

export function PublicPageShell({ children, footerContent, starfield = true }: Props) {
  if (!starfield) {
    return (
      <>
        <Nav />
        <div className="public-page">{children}</div>
        <Footer content={footerContent} />
      </>
    );
  }

  return (
    <main className="public-home--palantir public-home--starfield public-starfield-route">
      <StarfieldBackground />
      <div className="public-home__layers">
        <Nav variant="palantir" />
        <div className="public-page public-page--starfield">{children}</div>
        <Footer content={footerContent} className="footer--ph" />
      </div>
    </main>
  );
}
