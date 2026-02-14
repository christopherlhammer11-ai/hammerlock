import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { VaultProvider } from "@/lib/vault-store";
import { SubscriptionProvider } from "@/lib/subscription-store";
import { I18nProvider } from "@/lib/i18n";
import Script from "next/script";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "VaultAI — Your AI. Your Data. Your Rules.",
  description: "Local-first AI with encrypted memory built for operators",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VaultAI",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00ff88",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jetbrains.variable}`}>
        <I18nProvider>
          <SubscriptionProvider>
            <VaultProvider>{children}</VaultProvider>
          </SubscriptionProvider>
        </I18nProvider>
        <Script
          id="electron-detect"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (navigator.userAgent.includes('Electron') || window.electron) {
                document.body.classList.add('electron-app');
              }
            `,
          }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
