import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { MonitoringProvider } from "@/components/MonitoringProvider";
import { PwaRegistrar } from "@/components/PwaRegistrar";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MELO — Find Your Vibe | African Music & AI Discovery",
  description:
    "An African-first music streaming and discovery platform that uses vibe-based discovery, personalization, and AI to help listeners find music they love — affordably and reliably.",
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#121212] text-white selection:bg-[#1DB95D] selection:text-black">
        <MonitoringProvider>
          {children}
          <PwaRegistrar />
        </MonitoringProvider>
      </body>
    </html>
  );
}
