import { Nav } from "@/components/public/Nav";
import { Hero } from "@/components/public/Hero";
import { Ticker } from "@/components/public/Ticker";
import { Mission } from "@/components/public/Mission";
import { BrandPositioning } from "@/components/public/BrandPositioning";
import { HomeNewsArticles } from "@/components/public/HomeNewsArticles";
import { HomeAiToolsTeaser } from "@/components/ai-tools/HomeAiToolsTeaser";
import { GearMedic } from "@/components/public/GearMedic";
import { Founder } from "@/components/public/Founder";
import { Closing } from "@/components/public/Closing";
import { Footer } from "@/components/public/Footer";
import { LiveProof } from "@/components/public/LiveProof";
import { StarfieldBackground } from "@/components/public/StarfieldBackground";
import { Partners } from "@/components/public/Partners";
import { getPageContent } from "@/lib/data";
import { getLatestArticles, getLatestNews } from "@/lib/data-learning";
import { getTeamMembers } from "@/lib/teamData";
import { getPartners } from "@/lib/data";
import "./public-palantir.css";
import "./home-news-articles.css";
import "./home-starfield.css";
import "./home-live-proof.css";

export default async function Home() {
  const [pageContent, latestNews, latestArticles, teamStripMembers, partners] =
    await Promise.all([
      getPageContent(),
      getLatestNews(8),
      getLatestArticles(6),
      getTeamMembers(6),
      getPartners(),
    ]);

  return (
    <main className="public-home public-home--palantir public-home--starfield">
      <StarfieldBackground />
      <div className="public-home__layers">
        <Nav variant="palantir" />
        <Hero content={pageContent.hero} template="palantir" />

        {/* Trust anchor: live proof of activity */}
        <LiveProof />

        <HomeAiToolsTeaser home={pageContent.homePage} />
        <HomeNewsArticles
          home={pageContent.homePage}
          news={latestNews}
          articles={latestArticles}
          template="palantir"
        />
        <Ticker className="ticker--ph" tickerItems={pageContent.homePage.tickerItems} />
        <Mission content={pageContent.mission} className="mission--ph mission--bg-glass" />
        <BrandPositioning content={pageContent.brand} template="palantir" />
        <GearMedic content={pageContent.gearmedic} className="product--ph product--bg-glass" />

        {partners.length > 0 ? <Partners partners={partners} /> : null}

        <Founder content={pageContent.founder} />
        <Closing content={pageContent.closing} />
        <Footer
          content={pageContent.footer}
          className="footer--ph"
          teamStrip={
            teamStripMembers.length
              ? { teamPage: pageContent.teamPage, members: teamStripMembers }
              : null
          }
        />
      </div>
    </main>
  );
}
