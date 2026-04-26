import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getPageContent } from "@/lib/data";
import "./ai-tools.css";

export default async function AiToolsLayout({ children }: { children: React.ReactNode }) {
  const pageContent = await getPageContent();
  return <PublicPageShell footerContent={pageContent.footer}>{children}</PublicPageShell>;
}
