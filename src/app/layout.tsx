import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "GJPL Cricket Premier League",
  description: "Complete tournament management system with live auction capabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0e27] text-white min-h-screen">
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
