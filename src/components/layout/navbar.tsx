"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Calendar, 
  Clock, 
  FileText, 
  LogOut, 
  PlusCircle, 
  CheckSquare, 
  BarChart3, 
  Wrench, 
  Layers
} from "lucide-react";

interface NavbarProps {
  user: User;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Building2 },
    { href: "/resources", label: "Resources", icon: Layers },
    ...(user.role === "FACULTY"
      ? [
          { href: "/request/new", label: "New Request", icon: PlusCircle },
          { href: "/requests", label: "My Requests", icon: FileText },
        ]
      : []),
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/timeline", label: "Timeline", icon: Clock },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/requests", label: "Triage Requests", icon: CheckSquare },
          { href: "/admin/resources", label: "Manage Inventory (B)", icon: Layers },
          { href: "/admin/maintenance", label: "Maintenance (B)", icon: Wrench },
          { href: "/admin/analytics", label: "Analytics (B)", icon: BarChart3 },
        ]
      : []),
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-white hover:text-slate-200">
              <span className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-mono">CR</span>
              <span className="text-sm font-semibold tracking-wide">Campus Resource Platform</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User info & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user.name}</span>
              <Badge variant={user.role} className="text-[10px] py-0 px-1.5">
                {user.role}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs px-2 py-1"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
