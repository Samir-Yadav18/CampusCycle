"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Lock, 
  Sparkles,
  Info,
  Clock,
  ChevronRight,
  Filter
} from "lucide-react";
import { StudentWallet, WalletTransaction } from "@/lib/walletStore";

interface CampusWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount?: number; // Optional: when opened due to insufficient balance
  onSuccessTopUp?: (newBalance: number) => void;
}

export const CampusWalletModal: React.FC<CampusWalletModalProps> = ({
  isOpen,
  onClose,
  requiredAmount,
  onSuccessTopUp,
}) => {
  const studentId = "IITB-22B0814";
  const [wallet, setWallet] = useState<StudentWallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"overview" | "add-money" | "history">("overview");

  // Add Money Form State
  const [topUpAmount, setTopUpAmount] = useState<string>("100");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD">("UPI");
  const [upiVpa, setUpiVpa] = useState<string>("aryan@okhdfcbank");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "idle"; message: string }>({
    type: "idle",
    message: "",
  });

  // Transaction history filter
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");

  const fetchWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/wallet?studentId=${studentId}`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setWallet(data.wallet);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      setFeedback({ type: "idle", message: "" });
      if (requiredAmount && wallet && wallet.balance < requiredAmount) {
        setActiveTab("add-money");
        const shortfall = Math.ceil(requiredAmount - wallet.balance);
        setTopUpAmount(shortfall > 0 ? shortfall.toString() : "50");
      }
    }
  }, [isOpen, fetchWallet, requiredAmount, wallet]);

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(topUpAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid top-up amount greater than ₹0." });
      return;
    }

    setIsProcessing(true);
    setFeedback({ type: "idle", message: "" });

    try {
      const idempotencyKey = `TOPUP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: amountNum,
          paymentMethod,
          idempotencyKey,
          gatewayOrderId: `DEMO-GATEWAY-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({ type: "error", message: data.error || "Top-up failed verification." });
        return;
      }

      setWallet(data.wallet);
      setFeedback({
        type: "success",
        message: `₹${amountNum.toFixed(2)} added successfully via ${paymentMethod} (Sandbox Demo Provider).`,
      });

      if (onSuccessTopUp && data.wallet) {
        onSuccessTopUp(data.wallet.balance);
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error during top-up.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const currentBalance = wallet ? wallet.balance : 0;
  const isInsufficient = requiredAmount !== undefined && currentBalance < requiredAmount;
  const shortfall = requiredAmount ? Math.max(0, requiredAmount - currentBalance) : 0;

  const filteredTransactions = (wallet?.transactions || []).filter((t) => {
    if (historyFilter === "ALL") return true;
    return t.type === historyFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#006699] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Wallet className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-space font-extrabold text-lg text-white">Campus Wallet</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Sandbox Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Student ID: <strong>{studentId}</strong> • Aryan K.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sandbox Notice Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Sandbox Mode:</strong> Payment provider in test environment. Demo credits are simulated and isolated from real bank funds.
          </span>
        </div>

        {/* Insufficient Balance Alert (if opened with a required amount) */}
        {isInsufficient && (
          <div className="m-6 mb-0 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Insufficient Wallet Balance</span>
            </div>
            <p className="text-slate-700">
              Required: <strong>₹{requiredAmount?.toFixed(2)}</strong> • Available: <strong>₹{currentBalance.toFixed(2)}</strong>.
              Please add at least <strong>₹{shortfall.toFixed(2)}</strong> to proceed.
            </p>
          </div>
        )}

        {/* Sub-Nav Tabs */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100 text-xs font-bold text-slate-500">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === "overview"
                ? "border-[#006699] text-[#006699]"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            Balance Overview
          </button>
          <button
            onClick={() => setActiveTab("add-money")}
            className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "add-money"
                ? "border-[#006699] text-[#006699]"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <span>Add Money</span>
            {isInsufficient && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === "history"
                ? "border-[#006699] text-[#006699]"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            Transaction History
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#006699] text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Available Student Transit Balance</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Active
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Balance</span>
                  <div className="font-space font-extrabold text-4xl text-white">
                    ₹{currentBalance.toFixed(2)}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Flat Rental Tariff: ₹25.00 / hour</span>
                  <button
                    onClick={() => setActiveTab("add-money")}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-accent hover:bg-lime-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-1"
                  >
                    <span>+ Add Money</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions & Policy Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Rental Rate</span>
                  <div className="font-space font-bold text-base text-slate-900">₹25.00 / hr</div>
                  <span className="text-[11px] text-slate-500 block">Strictly duration-based</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Distance Tariff</span>
                  <div className="font-space font-bold text-base text-emerald-700">₹0.00 / km</div>
                  <span className="text-[11px] text-slate-500 block">Zero distance charges</span>
                </div>
              </div>

              {/* Recent Activity Snapshot */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-space font-bold text-xs uppercase tracking-wider text-slate-700">
                    Recent Transactions
                  </h4>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-[#006699] font-bold hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2">
                  {(wallet?.transactions || []).slice(0, 3).map((txn) => (
                    <div
                      key={txn.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          txn.type === "CREDIT" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-rose-100 text-rose-700"
                        }`}>
                          {txn.type === "CREDIT" ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 truncate max-w-[200px]">
                            {txn.description}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(txn.createdAt).toLocaleDateString()} • {txn.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-space font-bold ${
                          txn.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {txn.type === "CREDIT" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Bal: ₹{txn.balanceAfter.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADD MONEY */}
          {activeTab === "add-money" && (
            <form onSubmit={handleTopUpSubmit} className="space-y-5">
              {/* Preset Amounts */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Amount (₹):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["50", "100", "200", "500"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition ${
                        topUpAmount === preset
                          ? "bg-[#006699] text-white border-[#006699] shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Or enter custom amount:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    step="1"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006699]"
                    required
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Payment Method (Sandbox Provider):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      paymentMethod === "UPI"
                        ? "bg-sky-50 border-[#006699] ring-2 ring-[#006699]/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-[#006699] mt-0.5" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Instant UPI</div>
                      <span className="text-[10px] text-slate-500">Google Pay, PhonePe, Paytm</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      paymentMethod === "CARD"
                        ? "bg-sky-50 border-[#006699] ring-2 ring-[#006699]/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-[#006699] mt-0.5" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Debit / Credit Card</div>
                      <span className="text-[10px] text-slate-500">RuPay, Visa, Mastercard</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security & Credentials Disclaimer */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Legitimate Payment Provider Security Protocol</span>
                </div>
                <p>
                  Zero raw card numbers, CVVs, or UPI PINs are handled or stored. When production credentials are configured, redirection or drop-in SDK handshakes occur directly with the certified provider.
                </p>
              </div>

              {/* Feedback Alert */}
              {feedback.type === "success" && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              {feedback.type === "error" && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl bg-[#006699] hover:bg-[#005580] disabled:bg-slate-300 text-white font-space font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Sandbox Payment...</span>
                  </>
                ) : (
                  <span>Add ₹{parseFloat(topUpAmount || "0").toFixed(2)} to Campus Wallet</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: TRANSACTION HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setHistoryFilter("ALL")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      historyFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    All ({wallet?.transactions.length || 0})
                  </button>
                  <button
                    onClick={() => setHistoryFilter("CREDIT")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      historyFilter === "CREDIT" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Top-Up Credits
                  </button>
                  <button
                    onClick={() => setHistoryFilter("DEBIT")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      historyFilter === "DEBIT" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Rental Debits
                  </button>
                </div>

                <button
                  onClick={fetchWallet}
                  className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-500"
                  title="Refresh Transactions"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                  No transactions found in this category.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          t.type === "CREDIT" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {t.type === "CREDIT" ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">{t.description}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                            <span>{new Date(t.createdAt).toLocaleString()}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">Ref: {t.referenceId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-space font-extrabold text-sm ${
                          t.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {t.type === "CREDIT" ? "+" : "-"}₹{t.amount.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
                          <span className="font-mono">Bal: ₹{t.balanceAfter.toFixed(2)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold uppercase">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
