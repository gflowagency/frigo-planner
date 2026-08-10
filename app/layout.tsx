import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree, Geist_Mono } from "next/font/google";
import "./globals.css";

// Fraunces (warm editorial serif, for headings) + Figtree (humanist
// grotesk, for body/UI) replace the default Geist pairing on purpose —
// Geist reads instantly as "generic Vercel/AI-tool app" at this point.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frigo Planner",
  description: "Stock du frigo, recettes et courses pour le foyer.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Frigo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#c1602e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Next's appleWebApp metadata only emits the unified "mobile-web-app-capable"
            tag; older iOS Safari versions still need this legacy Apple-specific one
            to launch standalone (no browser chrome) from the home screen. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
