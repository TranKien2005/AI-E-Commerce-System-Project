import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PageWrapper from "@/components/PageWrapper";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aeris | Purity in Motion",
  description: "Premium smart home appliances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <PageWrapper>
          <main className="flex-grow flex flex-col pt-16">
            {children}
          </main>
        </PageWrapper>
      </body>
    </html>
  );
}
