import { PublicPageShell } from "@/components/public/PublicPageShell";
import { ClientShell } from "@/components/shared/ClientShell";
import { getPageContent } from "@/lib/data";
import "./ai-tools.css";
import "@/components/shared/theme-toggle.css";
import "../globals-shadcn.css";

export default async function AiToolsLayout({ children }: { children: React.ReactNode }) {
  const pageContent = await getPageContent();
  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <ClientShell>{children}</ClientShell>
    </PublicPageShell>
  );
}
