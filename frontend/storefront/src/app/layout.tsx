import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PageWrapper from "@/components/PageWrapper";
import SellerChatWidget from "@/components/SellerChatWidget";
import StorefrontChatWidget from "@/components/StorefrontChatWidget";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Aeris Market | Marketplace",
  description: "A marketplace with product search, shop chat, orders, and seller tools.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Navbar />
        <PageWrapper>
          <main className="min-h-screen pt-20">{children}</main>
        </PageWrapper>
        <SellerChatWidget />
        <StorefrontChatWidget />
      </body>
    </html>
  );
}
