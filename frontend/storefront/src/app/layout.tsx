import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PageWrapper from "@/components/PageWrapper";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Aeris Market | AI E-Commerce System",
  description: "Sàn thương mại điện tử tích hợp tìm kiếm ý định, chatbot và công cụ hỗ trợ người bán.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Navbar />
        <PageWrapper>
          <main className="min-h-screen pt-20">{children}</main>
        </PageWrapper>
      </body>
    </html>
  );
}
