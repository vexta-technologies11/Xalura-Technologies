import { Nav } from "@/components/public/Nav";
import { Hero } from "@/components/public/Hero";
import { Ticker } from "@/components/public/Ticker";
import { Mission } from "@/components/public/Mission";
import { BrandPositioning } from "@/components/public/BrandPositioning";
import { HomeNewsArticles } from "@/components/public/HomeNewsArticles";
import { HomeAiToolsTeaser } from "@/components/ai-tools/HomeAiToolsTeaser";
import { GearMedic } from "@/components/public/GearMedic";
import { Footer } from "@/components/public/Footer";
import { StarfieldBackground } from "@/components/public/StarfieldBackground";
import { getPageContent } from "@/lib/data";
import { getLatestArticles, getLatestNews } from "@/lib/data-learning";
import "./public-palantir.css";
import "./home-news-articles.css";
import "./home-starfield.css";

export default async function Home() {
  const [pageContent, latestNews, latestArticles] = await Promise.all([
    getPageContent(),
    getLatestNews(8),
    getLatestArticles(6),
  ]);

  return (
    <main className="public-home public-home--palantir public-home--starfield">
      <StarfieldBackground />
      <div className="public-home__layers">
        <Nav variant="palantir" />
        <Hero content={pageContent.hero} template="palantir" />
        <HomeAiToolsTeaser />
        <HomeNewsArticles news={latestNews} articles={latestArticles} template="palantir" />
        <Ticker className="ticker--ph" />
        <Mission content={pageContent.mission} className="mission--ph mission--bg-glass" />
        <BrandPositioning content={pageContent.brand} template="palantir" />
        <GearMedic content={pageContent.gearmedic} className="product--ph product--bg-glass" />
        <Footer content={pageContent.footer} className="footer--ph" />
      </div>
    </main>
  );
}
