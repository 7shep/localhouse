import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalHouse",
  description: "A local-first house status dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark font-sans">
      <body>{children}</body>
    </html>
  );
}
