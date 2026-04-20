import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, Libre_Bodoni } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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

export const metadata: Metadata = {
  title: "Xalura Tech",
  description:
    "Practical AI systems for real-world operations — autonomous content, diagnostics, and operations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
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
      </head>
      <body className={`${dmSans.variable} ${cormorant.variable} ${founderBodoni.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
