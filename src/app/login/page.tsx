"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Clock
} from "lucide-react";

interface Department {
  id: number;
  code: string;
  name: string;
}

interface FacultyAdvisor {
  id: number;
  name: string;
  email: string;
  department_name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "register">("signin");

  // Sign in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinLoading, setSigninLoading] = useState(false);

  // Registration state
  const [regRole, setRegRole] = useState<"FACULTY" | "CLUB">("FACULTY");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regDepartmentId, setRegDepartmentId] = useState<number | "">("");
  
  // Club specific registration fields
  const [clubName, setClubName] = useState("");
  const [clubLeadName, setClubLeadName] = useState("");
  const [clubLeadPhone, setClubLeadPhone] = useState("");
  const [clubCategory, setClubCategory] = useState("Technical");
  const [clubDescription, setClubDescription] = useState("");
  const [clubFoundedYear, setClubFoundedYear] = useState<number | "">(2024);
  const [clubAdvisorId, setClubAdvisorId] = useState<number | "">("");

  // Metadata
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyAdvisors, setFacultyAdvisors] = useState<FacultyAdvisor[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);

  // Status banners
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Fetch departments and advisors for registration
  useEffect(() => {
    setMetaLoading(true);
    fetch("/api/metadata")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setDepartments(json.data.departments || []);
          setFacultyAdvisors(json.data.faculty_advisors || []);
          if (json.data.departments?.length > 0) {
            setRegDepartmentId(json.data.departments[0].id);
          }
          if (json.data.faculty_advisors?.length > 0) {
            setClubAdvisorId(json.data.faculty_advisors[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading metadata:", err))
      .finally(() => setMetaLoading(false));
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSigninError(null);
    setSigninLoading(true);

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
      setSigninError(err.message || "Failed to sign in");
    } finally {
      setSigninLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match");
      return;
    }

    setRegLoading(true);

    try {
      let payload: any;
      if (regRole === "FACULTY") {
        payload = {
          role: "FACULTY",
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          department_id: Number(regDepartmentId),
        };
      } else {
        payload = {
          role: "CLUB",
          club_name: clubName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          lead_name: clubLeadName.trim(),
          lead_phone: clubLeadPhone.trim() || null,
          category: clubCategory,
          description: clubDescription.trim() || null,
          founded_year: clubFoundedYear ? Number(clubFoundedYear) : null,
          faculty_advisor_id: Number(clubAdvisorId),
          department_id: regDepartmentId ? Number(regDepartmentId) : null,
        };
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Registration failed");
      }

      setRegSuccess(json.data?.message || "Registration submitted successfully!");
      // Prefill signin email
      setEmail(regEmail);
      setPassword(regPassword);
      // Switch back to signin tab after 2.5 seconds
      setTimeout(() => {
        setTab("signin");
      }, 2500);
    } catch (err: any) {
      setRegError(err.message || "Failed to submit registration");
    } finally {
      setRegLoading(false);
    }
  };

  const prefill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setSigninError(null);
    setTab("signin");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Institutional Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white mb-3 shadow-lg shadow-blue-600/30">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Campus Resource Platform
          </h1>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Institutional resource reservation, faculty advisor endorsement, and conflict governance system
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => { setTab("signin"); setSigninError(null); }}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                tab === "signin"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In to Platform
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setRegError(null); }}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                tab === "register"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account / Register
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* ============================================================== */}
            {/* SIGN IN VIEW */}
            {/* ============================================================== */}
            {tab === "signin" && (
              <div className="space-y-5">
                {signinError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{signinError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label="Institutional Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@campus.edu or faculty1@campus.edu"
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
                    isLoading={signinLoading}
                  >
                    <span>Sign In to Platform</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>

                {/* Quick-fill Demo Accounts */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Development Test Accounts
                    </span>
                    <span className="text-[10px] text-slate-400">One-click prefill</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Admin */}
                    <button
                      type="button"
                      onClick={() => prefill("admin@campus.edu", "Admin@123")}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">Dr. Alan Turing</div>
                        <div className="text-slate-500 text-[11px]">admin@campus.edu</div>
                      </div>
                      <span className="text-[10px] bg-purple-100 text-purple-700 font-mono font-medium px-1.5 py-0.5 rounded">ADMIN</span>
                    </button>

                    {/* Faculty CS */}
                    <button
                      type="button"
                      onClick={() => prefill("faculty1@campus.edu", "Faculty@123")}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">Dr. Grace Hopper</div>
                        <div className="text-slate-500 text-[11px]">faculty1@campus.edu</div>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-mono font-medium px-1.5 py-0.5 rounded">FACULTY</span>
                    </button>

                    {/* Faculty EC */}
                    <button
                      type="button"
                      onClick={() => prefill("faculty2@campus.edu", "Faculty@123")}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">Dr. Claude Shannon</div>
                        <div className="text-slate-500 text-[11px]">faculty2@campus.edu</div>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-mono font-medium px-1.5 py-0.5 rounded">FACULTY</span>
                    </button>

                    {/* Club 1 */}
                    <button
                      type="button"
                      onClick={() => prefill("club1@campus.edu", "Club@123")}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">ACM Student Chapter</div>
                        <div className="text-slate-500 text-[11px]">club1@campus.edu</div>
                      </div>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-mono font-medium px-1.5 py-0.5 rounded">CLUB</span>
                    </button>

                    {/* Club 2 */}
                    <button
                      type="button"
                      onClick={() => prefill("club2@campus.edu", "Club@123")}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">Robotics Society</div>
                        <div className="text-slate-500 text-[11px]">club2@campus.edu</div>
                      </div>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-mono font-medium px-1.5 py-0.5 rounded">CLUB</span>
                    </button>

                    {/* Pending Account */}
                    <button
                      type="button"
                      onClick={() => prefill("pending.club@campus.edu", "Club@123")}
                      className="flex items-center justify-between p-2 rounded-md border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-amber-900 text-xs">Design &amp; Innovation</div>
                        <div className="text-amber-700 text-[11px]">pending.club@campus.edu</div>
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-800 font-mono font-medium px-1.5 py-0.5 rounded">PENDING</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* REGISTRATION VIEW */}
            {/* ============================================================== */}
            {tab === "register" && (
              <div className="space-y-5">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="font-semibold">Application Received</div>
                      <div className="mt-0.5">{regSuccess}</div>
                    </div>
                  </div>
                )}

                {/* Role Selector Tabs */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Select Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegRole("FACULTY")}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        regRole === "FACULTY"
                          ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <GraduationCap className={`w-5 h-5 mt-0.5 ${regRole === "FACULTY" ? "text-blue-600" : "text-slate-400"}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Faculty Account</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Academic staff &amp; club advisors</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole("CLUB")}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        regRole === "CLUB"
                          ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Users className={`w-5 h-5 mt-0.5 ${regRole === "CLUB" ? "text-teal-600" : "text-slate-400"}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Student Club / Society</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Events, workshops &amp; activities</div>
                      </div>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Administrator accounts are provisioned exclusively by Campus IT Governance.</span>
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 pt-2">
                  {/* FACULTY FORM FIELDS */}
                  {regRole === "FACULTY" && (
                    <>
                      <Input
                        label="Full Name (with title)"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Dr. Jane Doe"
                      />

                      <Input
                        label="Institutional Email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. jane.doe@campus.edu"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Password"
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 8 characters"
                        />
                        <Input
                          label="Confirm Password"
                          type="password"
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                        />
                      </div>

                      <Select
                        label="Academic Department"
                        required
                        value={regDepartmentId}
                        onChange={(e) => setRegDepartmentId(Number(e.target.value))}
                        options={departments.map((d) => ({
                          value: d.id,
                          label: `${d.name} (${d.code})`,
                        }))}
                      />
                    </>
                  )}

                  {/* CLUB FORM FIELDS */}
                  {regRole === "CLUB" && (
                    <>
                      <Input
                        label="Club / Society Name"
                        required
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        placeholder="e.g. AI & Machine Learning Society"
                      />

                      <Input
                        label="Official Club Email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. aiml.club@campus.edu"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Password"
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 8 characters"
                        />
                        <Input
                          label="Confirm Password"
                          type="password"
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Lead Student / President Name"
                          required
                          value={clubLeadName}
                          onChange={(e) => setClubLeadName(e.target.value)}
                          placeholder="e.g. Priya Nair"
                        />
                        <Input
                          label="Contact Phone"
                          value={clubLeadPhone}
                          onChange={(e) => setClubLeadPhone(e.target.value)}
                          placeholder="e.g. +91 98765 00000"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                          label="Club Category"
                          value={clubCategory}
                          onChange={(e) => setClubCategory(e.target.value)}
                          options={[
                            { value: "Technical", label: "Technical & Coding" },
                            { value: "Cultural", label: "Cultural & Performing Arts" },
                            { value: "Sports", label: "Sports & Athletics" },
                            { value: "Literary", label: "Literary & Debate" },
                            { value: "Social", label: "Social Outreach & NSS" },
                            { value: "Academic", label: "Academic & Research" },
                            { value: "Other", label: "Special Interest Group" },
                          ]}
                        />
                        <Input
                          label="Founded Year"
                          type="number"
                          value={clubFoundedYear}
                          onChange={(e) => setClubFoundedYear(e.target.value ? Number(e.target.value) : "")}
                          placeholder="e.g. 2022"
                        />
                      </div>

                      <Textarea
                        label="Club Purpose & Description"
                        value={clubDescription}
                        onChange={(e) => setClubDescription(e.target.value)}
                        rows={2}
                        placeholder="Brief overview of annual goals, planned workshops, and target audience..."
                      />

                      {/* Nominated Faculty Advisor Selector */}
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 mb-1">
                          <GraduationCap className="w-4 h-4 text-indigo-700" />
                          <span>Nominate Faculty Advisor</span>
                        </div>
                        <p className="text-[11px] text-indigo-800/80 mb-2">
                          All student clubs require an active faculty advisor. The nominated advisor will review and endorse your event proposals before administrative allocation.
                        </p>
                        <Select
                          required
                          value={clubAdvisorId}
                          onChange={(e) => setClubAdvisorId(Number(e.target.value))}
                          options={facultyAdvisors.map((fa) => ({
                            value: fa.id,
                            label: `${fa.name} — ${fa.department_name} (${fa.email})`,
                          }))}
                        />
                      </div>
                    </>
                  )}

                  {/* Verification Policy Notice */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800">Institutional Review Policy: </span>
                      <span>
                        Submitted registrations undergo institutional administrator verification. Club accounts also require acceptance by the nominated faculty advisor before venue reservations can be submitted.
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="md"
                    isLoading={regLoading}
                  >
                    <span>Submit Institutional Registration</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-400">
          Campus Resource Allocation &amp; Conflict Detection Platform • Authorized Personnel &amp; Organizations Only
        </div>
      </div>
    </div>
  );
}
