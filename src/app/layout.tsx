import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Database Print View",
  description: "View and print all pages from a Notion database",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
