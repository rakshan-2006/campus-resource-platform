"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
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
  Layers,
  ChevronDown,
  UserCheck,
  Menu,
  X,
  Users
} from "lucide-react";

interface NavbarProps {
  user: User;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAdminMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const isAdminActive = pathname.startsWith("/admin");

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:text-slate-200 transition-colors"
            >
              <span className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-mono font-bold shadow-inner">
                CR
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-wide leading-tight">Campus Resource Platform</span>
                <span className="text-[10px] text-slate-400 font-normal hidden lg:inline">Resource Allocation &amp; Conflict Management</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/dashboard"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/resources"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  pathname.startsWith("/resources")
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Resources</span>
              </Link>

              {/* Faculty Links */}
              {user.role === "FACULTY" && (
                <>
                  <Link
                    href="/request/new"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pathname === "/request/new"
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>New Request</span>
                  </Link>
                  <Link
                    href="/requests"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pathname === "/requests"
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Requests</span>
                  </Link>
                  <Link
                    href="/advisor/inbox"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pathname === "/advisor/inbox"
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Advisor Desk</span>
                  </Link>
                </>
              )}

              {/* Club Links */}
              {user.role === "CLUB" && (
                <>
                  <Link
                    href="/request/new"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pathname === "/request/new"
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
                    <span>Event Request</span>
                  </Link>
                  <Link
                    href="/requests"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pathname === "/requests"
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Club Events</span>
                  </Link>
                </>
              )}

              <Link
                href="/bookings"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  pathname === "/bookings"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Bookings</span>
              </Link>

              <Link
                href="/timeline"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  pathname === "/timeline"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Timeline</span>
              </Link>

              {/* Admin Navigation Section */}
              {user.role === "ADMIN" && (
                <>
                  <Link
                    href="/admin/requests"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pathname === "/admin/requests"
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Triage Queue</span>
                  </Link>

                  {/* Clean Admin Dropdown Menu */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isAdminActive && pathname !== "/admin/requests"
                          ? "bg-slate-800 text-white font-semibold"
                          : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-purple-400" />
                      <span>Admin Tools</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {adminMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white border border-slate-200 py-1 text-slate-900 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Institutional Administration
                        </div>
                        
                        <Link
                          href="/admin/registrations"
                          className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900"
                        >
                          <UserCheck className="w-4 h-4 text-indigo-600" />
                          <div>
                            <div className="font-medium">Registration Review</div>
                            <div className="text-[10px] text-slate-500">Verify faculty and club accounts</div>
                          </div>
                        </Link>

                        <Link
                          href="/admin/resources"
                          className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900"
                        >
                          <Layers className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium">Resource Inventory</div>
                            <div className="text-[10px] text-slate-500">Catalog, facilities &amp; specifications</div>
                          </div>
                        </Link>

                        <Link
                          href="/admin/maintenance"
                          className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900"
                        >
                          <Wrench className="w-4 h-4 text-orange-600" />
                          <div>
                            <div className="font-medium">Maintenance Operations</div>
                            <div className="text-[10px] text-slate-500">Service schedules &amp; room locks</div>
                          </div>
                        </Link>

                        <Link
                          href="/admin/analytics"
                          className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900"
                        >
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div className="font-medium">Campus Analytics</div>
                            <div className="text-[10px] text-slate-500">Utilization metrics &amp; peak hours</div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </nav>
          </div>

          {/* Right Section: User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {user.club_name || user.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  {user.role === "CLUB" ? "Student Organization" : user.department_name}
                </div>
              </div>
              <Badge variant={user.role} className="text-[10px] py-0.5 px-2">
                {user.role}
              </Badge>
              {user.verification_status === "PENDING" && (
                <Badge variant="PENDING" className="text-[10px] py-0.5 px-1.5">
                  Pending Verification
                </Badge>
              )}
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 p-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Sign Out</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1 text-xs">
          <div className="py-2 border-b border-slate-800 mb-2">
            <div className="text-slate-200 font-semibold">{user.club_name || user.name}</div>
            <div className="text-[11px] text-slate-400">{user.email}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant={user.role} className="text-[10px] py-0 px-1.5">{user.role}</Badge>
              {user.verification_status === "PENDING" && (
                <Badge variant="PENDING" className="text-[10px] py-0 px-1.5">Pending</Badge>
              )}
            </div>
          </div>

          <Link href="/dashboard" className="block py-2 text-slate-300 hover:text-white">Dashboard</Link>
          <Link href="/resources" className="block py-2 text-slate-300 hover:text-white">Resources</Link>
          
          {user.role === "FACULTY" && (
            <>
              <Link href="/request/new" className="block py-2 text-emerald-400 hover:text-emerald-300">New Request</Link>
              <Link href="/requests" className="block py-2 text-slate-300 hover:text-white">My Requests</Link>
              <Link href="/advisor/inbox" className="block py-2 text-indigo-400 hover:text-indigo-300">Advisor Desk</Link>
            </>
          )}

          {user.role === "CLUB" && (
            <>
              <Link href="/request/new" className="block py-2 text-teal-400 hover:text-teal-300">Event Request</Link>
              <Link href="/requests" className="block py-2 text-slate-300 hover:text-white">Club Events</Link>
            </>
          )}

          <Link href="/bookings" className="block py-2 text-slate-300 hover:text-white">Campus Bookings</Link>
          <Link href="/timeline" className="block py-2 text-slate-300 hover:text-white">Timeline</Link>

          {user.role === "ADMIN" && (
            <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Admin Section</div>
              <Link href="/admin/requests" className="block py-2 text-amber-400">Triage Queue</Link>
              <Link href="/admin/registrations" className="block py-2 text-slate-300">Registration Review</Link>
              <Link href="/admin/resources" className="block py-2 text-slate-300">Resource Inventory</Link>
              <Link href="/admin/maintenance" className="block py-2 text-slate-300">Maintenance Operations</Link>
              <Link href="/admin/analytics" className="block py-2 text-slate-300">Campus Analytics</Link>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full text-left py-2 text-rose-400 hover:text-rose-300 mt-2 border-t border-slate-800"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
};
