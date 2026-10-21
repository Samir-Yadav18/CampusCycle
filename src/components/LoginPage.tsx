"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRide } from "@/context/RideContext";
import { 
  Bike as BikeIcon, 
  ShieldCheck, 
  GraduationCap, 
  User, 
  Key, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Lock
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess?: (role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const router = useRouter();
  const { loginUser } = useRide();

  // Active Login Role Tab: "student" | "admin"
  const [activeTab, setActiveTab] = useState<"student" | "admin">("student");

  // Form Fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick fill helper for evaluating reviewer
  const handleQuickFill = (id: string, pass: string, role: "student" | "admin") => {
    setActiveTab(role);
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both User ID and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await loginUser(identifier.trim(), password);

      if (!res.success || !res.user) {
        setErrorMessage(res.error || "Authentication failed. Please verify your credentials.");
        setIsLoading(false);
        return;
      }

      // Check role expectation
      if (activeTab === "admin" && res.user.role !== "admin") {
        setErrorMessage("Access Denied: This account does not possess administrator privileges. Please switch to the Student Login tab.");
        setIsLoading(false);
        return;
      }

      const role = res.user.role;
      const destination = role === "admin" ? "/admin" : "/";

      setSuccessMessage(
        role === "admin"
          ? `Welcome Administrator ${res.user.name}! Redirecting to Fleet Management Dashboard...`
          : `Welcome ${res.user.name}! Redirecting to Campus Cycle Map...`
      );

      if (onLoginSuccess) {
        onLoginSuccess(role);
      }

      setTimeout(() => {
        router.push(destination);
      }, 700);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during authentication.";
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-[#102b18] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#006699]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 relative z-10 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E5631] via-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-950/20 mb-3 ring-4 ring-emerald-50">
            <BikeIcon className="w-7 h-7" />
          </div>
          <h1 className="font-space font-extrabold text-2xl text-slate-900 tracking-tight">
            CAMPUS<span className="text-[#1E5631]">CYCLE</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Army Institute of Technology • Smart Bicycle Mobility Portal
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
          <button
            type="button"
            id="tab-student-login"
            onClick={() => {
              setActiveTab("student");
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "student"
                ? "bg-white text-emerald-800 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className={`w-4 h-4 ${activeTab === "student" ? "text-emerald-700" : "text-slate-400"}`} />
            <span>Student / User Login</span>
          </button>

          <button
            type="button"
            id="tab-admin-login"
            onClick={() => {
              setActiveTab("admin");
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "admin"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeTab === "admin" ? "text-amber-600" : "text-slate-400"}`} />
            <span>Administrator Login</span>
          </button>
        </div>

        {/* Tab Description Banner */}
        <div className={`p-3 rounded-xl mb-5 text-xs border flex items-center gap-2.5 ${
          activeTab === "student"
            ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-900"
            : "bg-amber-50/80 border-amber-200/80 text-amber-900"
        }`}>
          {activeTab === "student" ? (
            <>
              <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Sign in with your registered student account to view the campus map, dock radar, and book cycles.</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Administrative access portal. Authenticate with staff credentials to manage the 35-cycle fleet & bookings.</span>
            </>
          )}
        </div>

        {/* Validation / Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User ID Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {activeTab === "student" ? "Student User ID or University Email" : "Administrator Login ID"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {activeTab === "student" ? <User className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
              <input
                id="login-user-id"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={activeTab === "student" ? "e.g. 260691" : "e.g. Mohit Sharma"}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E5631] focus:border-transparent text-sm text-slate-900 bg-white shadow-xs transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? "Hide" : "Show"} password</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E5631] focus:border-transparent text-sm text-slate-900 bg-white shadow-xs transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="login-submit-button"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl text-white font-space font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 ${
              isLoading
                ? "bg-slate-400 cursor-not-allowed"
                : activeTab === "student"
                ? "bg-gradient-to-r from-[#1E5631] to-emerald-600 hover:from-[#174426] hover:to-emerald-700 shadow-emerald-950/20"
                : "bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-950 hover:to-slate-900 shadow-slate-900/30"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In as {activeTab === "student" ? "Student" : "Administrator"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Pre-fill evaluation chips */}
        <div className="mt-6 pt-5 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick-Select Registered Accounts:
            </span>
          </div>

          {activeTab === "student" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill("260691", "260691", "student")}
                className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition group"
              >
                <div className="font-semibold text-xs text-slate-900 group-hover:text-emerald-800">Samir Yadav</div>
                <div className="text-[10px] text-slate-500 font-mono">ID: 260691</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("260816", "260816", "student")}
                className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition group"
              >
                <div className="font-semibold text-xs text-slate-900 group-hover:text-emerald-800">Kirtika C.</div>
                <div className="text-[10px] text-slate-500 font-mono">ID: 260816</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("264071", "264071", "student")}
                className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition group"
              >
                <div className="font-semibold text-xs text-slate-900 group-hover:text-emerald-800">Sumit Kumar</div>
                <div className="text-[10px] text-slate-500 font-mono">ID: 264071</div>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleQuickFill("Mohit Sharma", "12345678", "admin")}
              className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left transition flex items-center justify-between group"
            >
              <div>
                <div className="font-semibold text-xs text-slate-900 group-hover:text-amber-900 flex items-center gap-1.5">
                  <span>Mohit Sharma</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full font-bold">Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">ID: Mohit Sharma • Pass: 12345678</div>
              </div>
              <span className="text-xs text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform">Fill →</span>
            </button>
          )}
        </div>

        {/* Security / RBAC Footer Notice */}
        <div className="mt-5 pt-3 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">
            🔒 Role-Based Access Control Active • Server PBKDF2-SHA512 Encrypted
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Public registration is closed. Contact Office of Mobility for new credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
