import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PreviewProvider } from "@/components/preview/PreviewContext";
import { PreviewSheet } from "@/components/preview/PreviewSheet";
import { ToastProvider } from "@/components/toast/Toaster";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

// Explicit viewport so phone Safari doesn't apply its idiosyncratic
// auto-zoom on form fields. Allow user scaling for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f9f5ee",
  viewportFit: "cover"
};

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
        <ToastProvider>
          <PreviewProvider>
            {children}
            <PreviewSheet />
            <MobileTabBar />
          </PreviewProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
