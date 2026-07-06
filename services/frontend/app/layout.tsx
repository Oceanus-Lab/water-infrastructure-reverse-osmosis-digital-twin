import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavHeader } from "@/components/nav-header";

const manrope = Manrope({
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
    <html lang="en" className="h-full antialiased">
      <body className={`${manrope.className} h-full flex flex-col overflow-hidden bg-[#FBFBFA]`}>
        <TooltipProvider>
          <NavHeader />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
