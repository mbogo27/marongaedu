import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const general = await getSetting("general");
  return {
    metadataBase: new URL(env.APP_URL),
    title: {
      default: `${general.siteName} | ${general.tagline}`,
      template: `%s | ${general.siteName}`,
    },
    description: general.tagline,
    openGraph: { siteName: general.siteName, type: "website" },
    ...(general.faviconUrl ? { icons: { icon: general.faviconUrl } } : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">{children}</body>
    </html>
  );
}
