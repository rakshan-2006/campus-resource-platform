import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Campus Resource Allocation & Conflict Detection Platform",
  description: "DBMS Mini-Project: Explainable Resource Recommendations and Conflict-Free Resource Booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen text-slate-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
