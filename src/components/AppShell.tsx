import type { ReactNode } from "react";
import type { User } from "../types";
import { lastName } from "../types";
import { Logo } from "./Logo";

export function AppShell({
  user,
  onLogout,
  children,
  noHeader,
}: {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  noHeader?: boolean;
}) {
  if (noHeader) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size={34} />
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
              <span className="font-mono text-[11px] px-1.5 py-0.5 bg-navy-900 text-white rounded">
                {user.role === "admin" ? "OPS" : "PIC"}
              </span>
              <span>{user.role === "admin" ? "Operations Console" : "Pilot Workspace"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-medium text-navy-900">
                {user.rank && <span className="text-[11.5px] font-semibold text-sky-600 mr-1">{user.rank}</span>}
                {lastName(user)}
                {user.callsign && <span className="ml-1.5 font-mono text-[11px] text-slate-400">{user.callsign}</span>}
              </div>
              <div className="text-[11.5px] text-slate-500 capitalize">{user.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white flex items-center justify-center text-[13px] font-semibold">
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <button
              onClick={onLogout}
              className="text-[12.5px] text-slate-500 hover:text-navy-900 px-2 py-1.5 rounded-md hover:bg-slate-100 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
