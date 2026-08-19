import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "La 22 | Admin",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La 22 Admin",
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}