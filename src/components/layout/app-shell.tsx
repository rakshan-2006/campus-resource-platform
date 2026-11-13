import React from "react";
import { getSessionUser } from "@/lib/auth";
import { Navbar } from "./navbar";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const user = await getSessionUser();

  if (!user) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        Campus Resource Allocation & Conflict Detection Platform • PostgreSQL 16 & MongoDB 7
      </footer>
    </div>
  );
}
