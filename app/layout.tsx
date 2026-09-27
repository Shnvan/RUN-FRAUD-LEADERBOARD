import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/bungee/400.css";
import "@fontsource/silkscreen/400.css";
import "./globals.css";
import {ThemeProvider} from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {default:"fraus",template:"%s — fraus"},
  description: "Explore reviewed buyer-reported unresolved losses by seller handle.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
