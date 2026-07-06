import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavHeader } from "@/components/nav-header";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
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
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="h-full flex flex-col overflow-hidden">
        <TooltipProvider>
          <NavHeader />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
