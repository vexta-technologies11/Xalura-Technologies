import { Nav } from "@/components/public/Nav";
import { Hero } from "@/components/public/Hero";
import { Ticker } from "@/components/public/Ticker";
import { Mission } from "@/components/public/Mission";
import { AIEmployees } from "@/components/public/AIEmployees";
import { GearMedic } from "@/components/public/GearMedic";
import { Dashboard } from "@/components/public/Dashboard";
import { TechStack } from "@/components/public/TechStack";
import { Founder } from "@/components/public/Founder";
import { Partners } from "@/components/public/Partners";
import { Closing } from "@/components/public/Closing";
import { Footer } from "@/components/public/Footer";
import { getEmployees, getPageContent, getPartners } from "@/lib/data";

export default async function Home() {
  const [employees, partners, pageContent] = await Promise.all([
    getEmployees(),
    getPartners(),
    getPageContent(),
  ]);

  return (
    <>
      <Nav />
      <Hero content={pageContent.hero} />
      <Ticker />
      <Mission content={pageContent.mission} />
      <AIEmployees employees={employees} />
      <GearMedic content={pageContent.gearmedic} />
      <Dashboard />
      <TechStack />
      <Founder content={pageContent.founder} />
      <Partners partners={partners} />
      <Closing content={pageContent.closing} />
      <Footer content={pageContent.footer} />
    </>
  );
}
