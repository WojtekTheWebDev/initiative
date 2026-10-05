import type { Metadata } from "next";
import { Barlow, Cinzel } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Initiative",
  description: "A planning playing game",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${cinzel.variable} h-dvh overflow-hidden antialiased`}>
      <body className="h-dvh overflow-hidden">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
