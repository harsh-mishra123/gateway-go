import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gateway Dashboard",
  description: "Real-time traffic monitoring and rule management for gateway-go",
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
