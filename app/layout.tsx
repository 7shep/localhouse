import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "localhouse_ / home operations",
  description: "A local-first house status dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
