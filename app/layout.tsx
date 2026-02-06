import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ordinaryarchive.com"),
  title: "Ordinary Archive — Immaculate Grid (Baseball) Search",
  description:
    "Search past Immaculate Grid (Baseball) puzzles by team, stat, award, birthplace, and more.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://ordinaryarchive.com",
    title: "Ordinary Archive — Immaculate Grid (Baseball) Search",
    description:
      "Search past Immaculate Grid (Baseball) puzzles by team, stat, award, birthplace, and more.",
    siteName: "Ordinary Archive",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "Ordinary Archive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ordinary Archive — Immaculate Grid (Baseball) Search",
    description:
      "Search past Immaculate Grid (Baseball) puzzles by team, stat, award, birthplace, and more.",
    images: ["/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ordinary Archive",
    url: "https://ordinaryarchive.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://ordinaryarchive.com/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
