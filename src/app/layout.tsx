import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PreviewProvider } from "@/components/preview/PreviewContext";
import { PreviewSheet } from "@/components/preview/PreviewSheet";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Where Next | Music Travel Map",
    template: "%s | Where Next"
  },
  description:
    "Discover where to travel for music, festivals, club seasons, and cultural nightlife moments around the world.",
  openGraph: {
    title: "Where Next | Music Travel Map",
    description:
      "A curated global music-travel map showing where the world is alive, when, and why to go.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <PreviewProvider>
          {children}
          <PreviewSheet />
        </PreviewProvider>
        <Analytics />
      </body>
    </html>
  );
}
