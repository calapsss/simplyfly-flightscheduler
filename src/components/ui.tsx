import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
      className
    )}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-[17px] font-semibold text-navy-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "secondary" | "danger"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const sizes = {
    sm: "px-3 py-1.5 text-[12.5px]",
    md: "px-4 py-2.5 text-[13.5px]",
  };
  const variants = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm",
    secondary: "bg-white border border-slate-200 text-navy-900 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-100",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-navy-900 placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn("block text-[12px] font-medium text-slate-600 mb-1.5", className)}>
      {children}
    </label>
  );
}

export function Pill({
  children,
  tone = "sky",
  className = "",
}: {
  children: ReactNode;
  tone?: "sky" | "navy" | "green" | "amber" | "slate";
  className?: string;
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    navy: "bg-navy-50 text-navy-700 border-navy-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone = "navy" }: { label: string; value: string | number; hint?: string; tone?: "navy" | "sky" }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("text-2xl font-semibold mt-1 tracking-tight", tone === "sky" ? "text-sky-600" : "text-navy-900")}>{value}</div>
      {hint && <div className="text-[12px] text-slate-500 mt-0.5">{hint}</div>}
    </Card>
  );
}
