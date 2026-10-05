import type { Metadata, Viewport } from "next";
import { Barlow, Cinzel } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

/** Body text of the HUD. */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/** Gold small capitals: the name tags on the table, the wordmark and HUD headings. */
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600"],
});

const DESCRIPTION =
  "A planning playing game: lay out your work as monsters and your team as heroes on a tabletop map, and see at a glance who fights what. It runs in your browser and keeps your table there.";

/** Where the site is served, for the canonical link and absolute image URLs. NEXT_PUBLIC_SITE_URL overrides it. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://initiative-ppg.vercel.app";

// The icons, the link preview image and the web manifest are files in app/ (see `npm run make:icons`).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Initiative · A planning playing game",
  description: DESCRIPTION,
  applicationName: "Initiative",
  authors: [{ name: "Wojciech Sikora", url: "https://www.wojciechsikora.dev/" }],
  creator: "Wojciech Sikora",
  keywords: ["planning", "team planning", "work tracker", "tabletop", "RPG", "game", "who works on what"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Initiative",
    title: "Initiative · A planning playing game",
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Initiative · A planning playing game",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#121410",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${cinzel.variable} h-dvh overflow-hidden antialiased`}>
      <body className="h-dvh overflow-hidden">
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
