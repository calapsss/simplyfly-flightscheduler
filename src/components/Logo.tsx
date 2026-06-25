type LogoProps = {
  size?: number;
  variant?: "on-light" | "on-dark";
  showWordmark?: boolean;
};

export function Logo({ size = 40, variant = "on-light", showWordmark = true }: LogoProps) {
  const stroke = variant === "on-dark" ? "#ffffff" : "#0b1e3f";
  const accent = "#3b82f6";
  const planeFill = variant === "on-dark" ? "#ffffff" : "#0b1e3f";
  const textFill = variant === "on-dark" ? "#ffffff" : "#0b1e3f";

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* S-shaped dashed flight path */}
        <path
          d="M4 30 C 14 30, 10 18, 20 18 S 30 6, 34 10"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.25"
        />
        <path
          d="M4 30 C 14 30, 10 18, 20 18 S 30 6, 34 10"
          stroke={accent}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          className="flight-path-animated"
        />
        {/* Small aircraft at the end of the S */}
        <g transform="translate(30 6) rotate(-25)">
          <path
            d="M0 2 L8 0 L12 2 L8 4 Z"
            fill={planeFill}
          />
          <path
            d="M5 2 L7 -2 L9 -2 L7 2 L9 6 L7 6 Z"
            fill={accent}
          />
          <circle cx="9.5" cy="2" r="0.8" fill={accent} />
        </g>
      </svg>
      {showWordmark && (
        <div className="leading-none select-none">
          <div className="text-[17px] font-bold tracking-tight" style={{ color: textFill }}>
            Simply<span style={{ color: accent }}>Fly</span>
          </div>
          <div
            className="text-[9px] font-medium tracking-[0.18em] uppercase mt-0.5"
            style={{ color: variant === "on-dark" ? "rgba(255,255,255,0.55)" : "#64748b" }}
          >
            Less admin. More flying.
          </div>
        </div>
      )}
    </div>
  );
}

export function PlaneIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"
        fill="currentColor"
      />
    </svg>
  );
}
