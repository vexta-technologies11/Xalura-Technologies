import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, Libre_Bodoni } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Bodoni family for founder line; GFS Didot loads first via stylesheet (Didot + Bodoni stack) */
const founderBodoni = Libre_Bodoni({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-founder-bodoni",
  display: "swap",
  adjustFontFallback: true,
});

/** Canonical public origin: tab icon, social previews, Google fetches absolute logo URL. */
function siteUrl(): string {
  const raw = process.env["NEXT_PUBLIC_SITE_URL"]?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  const v = process.env["VERCEL_URL"]?.trim();
  if (v) {
    return v.startsWith("http") ? new URL(v).origin : `https://${v.replace(/^\/+/, "")}`;
  }
  return "https://www.xaluratech.com";
}

const home = siteUrl();
const defaultLogo = `${home}/email/xalura-xt-logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(home),
  title: "Xalura Tech",
  description:
    "Practical AI systems for real-world operations — autonomous content, diagnostics, and operations.",
  openGraph: {
    type: "website",
    siteName: "Xalura Tech",
    title: "Xalura Tech",
    description:
      "Practical AI systems for real-world operations — autonomous content, diagnostics, and operations.",
    images: [
      {
        url: "/email/xalura-xt-logo.png",
        type: "image/png",
        alt: "Xalura Technologies",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Xalura Tech",
    description:
      "Practical AI systems for real-world operations — autonomous content, diagnostics, and operations.",
    images: ["/email/xalura-xt-logo.png"],
  },
  appleWebApp: {
    title: "Xalura Tech",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Xalura Technologies",
  url: home,
  logo: defaultLogo,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* GFS Didot: Next.js `next/font` typings only list a Greek subset; Latin text uses the hosted family */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=GFS+Didot&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={`${dmSans.variable} ${cormorant.variable} ${founderBodoni.variable}`}>
        {children}
      </body>
    </html>
  );
}
