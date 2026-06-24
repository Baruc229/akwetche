import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Akwetche - Votre assistant financier personnel",
  description:
    "Reprenez le contrôle de vos finances. Suivez vos dépenses, gérez votre budget et développez votre activité.",
  appleWebApp: {
    title: "Akwetche",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
