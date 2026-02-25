import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HammerLock AI — Investor Pitch Deck",
  description:
    "Private, encrypted AI for professionals who can't afford to leak. Seed Round — $6M.",
  openGraph: {
    title: "HammerLock AI — Investor Pitch Deck",
    description:
      "Your AI. Your Data. Your Rules. Private, encrypted AI for regulated professionals.",
    images: [
      {
        url: "/brand/hammerlock-og-banner.jpg",
        width: 1024,
        height: 1008,
      },
    ],
    siteName: "HammerLock AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HammerLock AI — Investor Pitch Deck",
    description:
      "Your AI. Your Data. Your Rules. Private, encrypted AI for regulated professionals.",
    images: ["/brand/hammerlock-og-banner.jpg"],
  },
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
