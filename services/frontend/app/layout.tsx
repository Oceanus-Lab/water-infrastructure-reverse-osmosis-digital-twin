import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavHeader } from "@/components/nav-header";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RO Digital Twin",
  description: "Visual Operations Twin for Reverse Osmosis Plant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans h-full flex flex-col overflow-hidden bg-background`}>
        <TooltipProvider>
          <NavHeader />
          {children}
          <AssistantPanel />
        </TooltipProvider>
      </body>
    </html>
  );
}
