import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Wrench,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  MapPin,
  Lock,
  Mail,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COOKIE_NAME } from "@shared/const";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [portal, setPortal] = useState<"admin" | "citizen">("admin");
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Mirror token into sessionStorage for iframe/webview authorization header fallback
      if (data.token) {
        try {
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.token}`);
        } catch {
          // ignore
        }
      }
      utils.auth.me.setData(undefined, data.user as any);
      await utils.auth.me.invalidate();
      toast.success(`Welcome back, ${data.user.name || data.user.email}!`);
      setLocation("/");
    },
    onError: (err) => {
      let msg = err.message || "Failed to sign in. Please verify credentials.";
      if (msg.includes("is not valid JSON") || msg.includes("Unexpected token") || msg.includes("A server e")) {
        msg = "Server API endpoint is initializing. Please check that database/server is online and retry.";
      }
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const handlePortalSwitch = (newPortal: "admin" | "citizen") => {
    setPortal(newPortal);
    setErrorMessage("");
    if (newPortal === "admin") {
      setEmail("admin@gmail.com");
      setPassword("123456");
    } else {
      setEmail("user@gmail.com");
      setPassword("123456");
    }
  };

  const handleQuickLogin = (role: "admin" | "citizen") => {
    const selectedEmail = role === "admin" ? "admin@gmail.com" : "user@gmail.com";
    const selectedPass = "123456";
    setEmail(selectedEmail);
    setPassword(selectedPass);
    setPortal(role);
    setErrorMessage("");
    loginMutation.mutate({
      email: selectedEmail,
      password: selectedPass,
      role: role === "admin" ? "admin" : "user",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    loginMutation.mutate({
      email,
      password,
      role: portal === "admin" ? "admin" : "user",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
              CityCare
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                v2.0
              </span>
            </div>
            <div className="text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
              Civic Infrastructure & Incident Management
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Municipal Grid
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-4xl grid md:grid-cols-12 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
          
          {/* Left / Info Side */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                <Sparkles size={13} />
                Two Portals, One Platform
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                Select your CityCare Portal
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Seamless civic engagement and operations management for citizens and city administrators.
              </p>

              {/* Portal capability cards */}
              <div className="space-y-3">
                <div
                  onClick={() => handlePortalSwitch("admin")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    portal === "admin"
                      ? "bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-semibold text-sm text-white">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Wrench size={15} />
                      </div>
                      Operations Admin Portal
                    </div>
                    {portal === "admin" && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400 pl-9">
                    Incident dispatch, SLA timers, status updates, after-photo proof, and department analytics.
                  </p>
                </div>

                <div
                  onClick={() => handlePortalSwitch("citizen")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    portal === "citizen"
                      ? "bg-slate-800/90 border-teal-500 shadow-md ring-1 ring-teal-500/50"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-semibold text-sm text-white">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                        <Users size={15} />
                      </div>
                      Citizen & Community Portal
                    </div>
                    {portal === "citizen" && <CheckCircle2 size={16} className="text-teal-400" />}
                  </div>
                  <p className="text-xs text-slate-400 pl-9">
                    Geo-tagged issue reporting, AI triage, community upvoting, live map tracker, and resolution signoff.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick-test buttons */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Quick 1-Click Demo Logins
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("admin")}
                  disabled={loginMutation.isPending}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-emerald-300 border border-emerald-500/30 transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Wrench size={13} /> Admin Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("citizen")}
                  disabled={loginMutation.isPending}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-teal-300 border border-teal-500/30 transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Users size={13} /> Citizen Demo
                </button>
              </div>
            </div>
          </div>

          {/* Right / Form Side */}
          <div className="md:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => handlePortalSwitch("admin")}
                className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  portal === "admin"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Wrench size={15} /> Operations Admin
              </button>
              <button
                type="button"
                onClick={() => handlePortalSwitch("citizen")}
                className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  portal === "citizen"
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users size={15} /> Citizen User
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">
                {portal === "admin" ? "Operations Admin Sign In" : "Citizen Portal Sign In"}
              </h2>
              <p className="text-xs text-slate-400">
                {portal === "admin"
                  ? "Default credentials: admin@gmail.com / 123456"
                  : "Default credentials: user@gmail.com / 123456"}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={portal === "admin" ? "admin@gmail.com" : "user@gmail.com"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (default: 123456)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <span className="font-bold text-emerald-400 shrink-0">TEST TIP:</span>
                <span>
                  Admin: <code className="text-emerald-300 font-mono">admin@gmail.com</code> | Citizen: <code className="text-teal-300 font-mono">user@gmail.com</code> | Password: <code className="text-amber-300 font-mono">123456</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loginMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter {portal === "admin" ? "Operations Console" : "Citizen Portal"}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-400">
        CityCare Municipal Civic Action System &copy; 2026 &bull; Production Infrastructure Hub
      </footer>
    </div>
  );
}
