import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rental Ops",
  description: "AI-assisted operations for property managers",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-deep text-text-primary">
        {children}
      </body>
    </html>
  );
}
