"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Shield, UserCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Authentication failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const prefill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-900 text-white mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Campus Resource Allocation Platform
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Institutional authentication for resource reservation and administration
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Institutional Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. faculty1@campus.edu"
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="md"
              isLoading={loading}
            >
              Sign In to Platform
            </Button>
          </form>

          {/* Quick-fill Demo Accounts */}
          {process.env.NODE_ENV !== "production" && <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Demo Test Accounts (One-Click Prefill)
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => prefill("admin@campus.edu", "Admin@123")}
                className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-800">Dr. Alan Turing</span>
                  <span className="text-slate-500 ml-1.5 text-[11px]">admin@campus.edu</span>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-700 font-mono px-1.5 py-0.5 rounded">ADMIN</span>
              </button>

              <button
                type="button"
                onClick={() => prefill("faculty1@campus.edu", "Faculty@123")}
                className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-800">Dr. Grace Hopper</span>
                  <span className="text-slate-500 ml-1.5 text-[11px]">faculty1@campus.edu</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-mono px-1.5 py-0.5 rounded">FACULTY (CS)</span>
              </button>

              <button
                type="button"
                onClick={() => prefill("faculty2@campus.edu", "Faculty@123")}
                className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-800">Dr. Claude Shannon</span>
                  <span className="text-slate-500 ml-1.5 text-[11px]">faculty2@campus.edu</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-mono px-1.5 py-0.5 rounded">FACULTY (EC)</span>
              </button>
            </div>
          </div>}
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Single authoritative PostgreSQL user store with session-scoped role validation.
        </div>
      </div>
    </div>
  );
}
