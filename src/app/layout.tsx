import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brand-font til logoet (koblop). Variabel Excon dækker alle vægte.
const excon = localFont({
  src: "../fonts/Excon_Complete/Fonts/TTF/Excon-Variable.ttf",
  variable: "--font-excon",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "koblop",
  description: "Planlægningsværktøj til kørelærere",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="da"
      className={`${geistSans.variable} ${geistMono.variable} ${excon.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
