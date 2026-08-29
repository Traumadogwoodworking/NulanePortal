import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { RootRouteShell } from "@/components/RootRouteShell";
import { publicBranding } from "@/lib/publicBranding";

const portalSans = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-portal-sans",
});

export const metadata: Metadata = {
  title: `${publicBranding.appName} | Nulane Systems`,
  description: publicBranding.shortDescription,
  icons: {
    icon: "/media/Docudent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${portalSans.variable} h-full antialiased`}>
      <body className="min-h-screen">
        <Suspense fallback={null}>
          <RootRouteShell>{children}</RootRouteShell>
        </Suspense>
      </body>
    </html>
  );
}
