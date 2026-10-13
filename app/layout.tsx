import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumate — Simple Resume Builder",
  description: "Build a polished resume in a few guided steps.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
