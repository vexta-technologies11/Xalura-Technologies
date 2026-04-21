import { Nav } from "./Nav";
import { Footer } from "./Footer";
import type { PageContentMap } from "@/types/content";

export function PublicPageShell({
  children,
  footerContent,
}: {
  children: React.ReactNode;
  footerContent: PageContentMap["footer"];
}) {
  return (
    <>
      <Nav />
      <div className="public-page">{children}</div>
      <Footer content={footerContent} />
    </>
  );
}
