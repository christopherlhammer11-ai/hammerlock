import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultAI",
  description: "Local, encrypted context layer for operators"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
