import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Metrics Explorer",
  description: "AI-powered product analytics without SQL",
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

