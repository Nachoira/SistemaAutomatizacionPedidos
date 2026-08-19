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
  title: "La 22 | Pedidos online",
  description: "Pedí tu comida y bebida online, recibila en tu casa.",
  manifest: "/manifest.json",
  openGraph: {
    title: "La 22 | Pedidos online",
    description: "Pedí tu comida y bebida online, recibila en tu casa.",
    images: [
      {
        url: "/images/la22.png",
        width: 512,
        height: 512,
        alt: "La 22",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La 22",
  },
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}