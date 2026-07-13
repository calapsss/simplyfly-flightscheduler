import { useState } from "react";
import type { Role, User } from "../types";
import { Logo } from "./Logo";
import { Button, Input, Label } from "./ui";

type LoginProps = {
  users: User[];
  onLogin: (user: User) => void;
};

export function Login({ users, onLogin }: LoginProps) {
  const [role, setRole] = useState<Role>("flyer");
  const [callsign, setCallsign] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedCallsign = callsign.trim();
    const match = users.find(
      (u) => u.callsign?.toLowerCase() === trimmedCallsign.toLowerCase() && u.role === role
    );

    if (!match) {
      setError("No account found for that callsign.");
      return;
    }

    if (match.active === false) {
      setError("This account is inactive.");
      return;
    }

    if (match.password && match.password !== password) {
      setError("Incorrect password.");
      return;
    }

    onLogin(match);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left panel — brand */}
      <div className="relative overflow-hidden bg-navy-900 text-white p-10 lg:p-14 flex flex-col">
        <div className="absolute inset-0 bg-cockpit-grid opacity-60 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Logo variant="on-dark" size={44} />
        </div>

        <div className="relative z-10 mt-auto mb-10">
          <svg viewBox="0 0 400 180" className="w-full max-w-md mb-8" aria-hidden>
            <defs>
              <linearGradient id="pathGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d="M10 150 C 110 150, 80 90, 180 90 S 300 30, 370 50"
              stroke="url(#pathGrad)"
              strokeWidth="2"
              fill="none"
              className="flight-path-animated"
            />
            <g transform="translate(350 35) rotate(-20)">
              <path d="M0 4 L14 0 L22 4 L14 8 Z" fill="#ffffff" />
              <path d="M9 4 L12 -4 L16 -4 L12 4 L16 12 L12 12 Z" fill="#60a5fa" />
            </g>
            <g transform="translate(10 150)">
              <circle r="3" fill="#60a5fa" />
              <circle r="8" fill="#60a5fa" opacity="0.3" />
            </g>
          </svg>

          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
            Less admin.<br />
            <span className="text-sky-300">More flying.</span>
          </h1>
          <p className="mt-5 text-white/65 max-w-md text-[15px] leading-relaxed">
            The operations cockpit for modern flight clubs. Schedules, aircraft blocks,
            and sortie planning — in one calm, readable workspace.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { k: "01", v: "Block times" },
              { k: "02", v: "Aircraft pool" },
              { k: "03", v: "Drag & schedule" },
            ].map((s) => (
              <div key={s.k} className="border-l border-white/15 pl-3">
                <div className="text-[11px] text-sky-300 font-mono">{s.k}</div>
                <div className="text-[13px] text-white/85 mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-white/40 tracking-wider font-mono">
          SIMPLYFLY OPS · v1.0 · PROTOTYPE
        </div>
      </div>

      {/* Right panel — login */}
      <div className="flex items-center justify-center p-8 lg:p-14">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="text-[12px] font-mono text-slate-400 uppercase tracking-wider mb-2">
              / sign in
            </div>
            <h2 className="text-2xl font-semibold text-navy-900 tracking-tight">
              Welcome back, pilot.
            </h2>
            <p className="text-[14px] text-slate-500 mt-1">
              Sign in with your callsign and password.
            </p>
          </div>

          {/* Role toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            {(["flyer", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(null); }}
                className={`py-2 text-[13px] font-medium rounded-lg transition ${
                  role === r
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r === "flyer" ? "✈  Flyer" : "◈  Admin"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Callsign</Label>
              <Input
                type="text"
                placeholder="e.g. 285"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-[12.5px] text-red-600">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in as {role === "flyer" ? "Flyer" : "Admin"}
            </Button>
          </form>


        </div>
      </div>
    </div>
  );
}
