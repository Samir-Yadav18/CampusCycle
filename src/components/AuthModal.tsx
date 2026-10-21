"use client";

import React, { useState } from "react";
import { useRide } from "@/context/RideContext";
import { 
  UserCheck, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Lock, 
  ArrowRight,
  AlertCircle
} from "lucide-react";

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    currentUser, 
    setCurrentUser, 
    loginUser, 
    availableUsers,
    refreshWallet
  } = useRide();

  const [userIdInput, setUserIdInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!userIdInput.trim() || !passwordInput.trim()) {
      setErrorMsg("Please enter both User ID and initial password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginUser(userIdInput.trim(), passwordInput.trim());
      if (!res.success || !res.user) {
        setErrorMsg(res.error || "Authentication failed. Check your User ID and password.");
      } else {
        setSuccessMsg(`Authenticated successfully as ${res.user.name}!`);
        await refreshWallet(res.user.userId);
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setSuccessMsg("");
        }, 900);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error logging in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = async (user: typeof availableUsers[0]) => {
    setErrorMsg("");
    setSuccessMsg("");
    setCurrentUser(user);
    try {
      localStorage.setItem("campuscycle_current_user", JSON.stringify(user));
    } catch {}
    await refreshWallet(user.userId);
    setSuccessMsg(`Switched active account to ${user.name} (${user.userId})`);
    setTimeout(() => {
      setIsAuthModalOpen(false);
      setSuccessMsg("");
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-[#1E5631] text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              CampusCycle Access
            </div>
            <h3 className="font-space text-xl font-extrabold tracking-tight">
              User Accounts & Sign In
            </h3>
            <p className="text-xs text-slate-300">
              Log in with your official university User ID and password.
            </p>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Feedback alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick User Switcher: 3 Required Accounts */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Select Active Campus User</span>
              <span className="text-[10px] text-slate-400">1-Click Fast Switch</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableUsers.map((u) => {
                const isActive = currentUser?.userId === u.userId;
                return (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => handleQuickSwitch(u)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                      isActive
                        ? "bg-emerald-50/80 border-[#1E5631] ring-2 ring-[#1E5631]/20 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-space font-bold text-xs ${
                        isActive 
                          ? "bg-[#1E5631] text-white" 
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {u.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-200 text-emerald-900 font-bold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          User ID: {u.userId} • {u.department || "Student"}
                        </div>
                      </div>
                    </div>
                    {isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1E5631]" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider relative">
              OR VERIFY CREDENTIALS
            </span>
          </div>

          {/* User ID & Password Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                User ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="e.g. 260691, 260816, 264071"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter initial password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#1E5631] hover:bg-[#164426] text-white font-space font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying PBKDF2 Hash...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-amber-300" />
                  <span>Log In With User ID</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
