import type { Metadata } from "next";
import "./globals.css";
import { Outfit, JetBrains_Mono } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "VaultAI — Your AI. Your Data. Your Rules.",
  description: "Local-first AI with encrypted memory built for operators"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jetbrains.variable}`}>{children}</body>
    </html>
  );
}
