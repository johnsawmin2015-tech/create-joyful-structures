import { cn } from "@/lib/utils";

interface SentinelLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  showText?: boolean;
  variant?: "full" | "icon" | "mono";
  alertActive?: boolean;
  className?: string;
}

const sizes = {
  sm: { svg: 28, text: "text-sm", gap: "gap-1.5" },
  md: { svg: 36, text: "text-lg", gap: "gap-2" },
  lg: { svg: 48, text: "text-2xl", gap: "gap-3" },
  xl: { svg: 64, text: "text-3xl", gap: "gap-4" },
};

export function SentinelLogo({
  size = "md",
  animate = true,
  showText = true,
  variant = "full",
  alertActive = false,
  className,
}: SentinelLogoProps) {
  const s = sizes[size];
  const isMono = variant === "mono";

  const primaryColor = isMono ? "currentColor" : "hsl(var(--primary))";
  const glowColor = isMono ? "none" : "hsl(var(--sentinel-cyan-glow))";
  const alertColor = "hsl(var(--sentinel-red))";

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      <div className="relative" style={{ width: s.svg, height: s.svg }}>
        <svg
          viewBox="0 0 100 100"
          width={s.svg}
          height={s.svg}
          className={cn(
            "transition-all duration-500",
            animate && !alertActive && "sentinel-logo-idle",
            alertActive && "sentinel-logo-alert"
          )}
        >
          <defs>
            {!isMono && (
              <>
                <radialGradient id="sentinel-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={glowColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                </radialGradient>
                <linearGradient id="sentinel-shield-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
                  <stop offset="100%" stopColor={primaryColor} stopOpacity="0.6" />
                </linearGradient>
                <filter id="sentinel-blur">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </>
            )}
          </defs>

          {/* Background glow */}
          {!isMono && animate && (
            <circle cx="50" cy="50" r="48" fill="url(#sentinel-glow)">
              <animate attributeName="r" values="44;48;44" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Shield body — geometric, sharp */}
          <path
            d="M50 8 L88 28 L88 55 Q88 75 50 95 Q12 75 12 55 L12 28 Z"
            fill="none"
            stroke={alertActive ? alertColor : primaryColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-colors duration-300"
          />

          {/* Inner shield frame */}
          <path
            d="M50 16 L80 32 L80 54 Q80 70 50 87 Q20 70 20 54 L20 32 Z"
            fill={isMono ? "none" : (alertActive ? alertColor : primaryColor)}
            fillOpacity={isMono ? 0 : 0.06}
            stroke={alertActive ? alertColor : primaryColor}
            strokeWidth="1"
            strokeOpacity="0.4"
            strokeLinejoin="round"
          />

          {/* Eye — the watcher */}
          <g className={cn(animate && "sentinel-eye")}>
            {/* Eye outline */}
            <path
              d="M30 50 Q50 32 70 50 Q50 68 30 50 Z"
              fill="none"
              stroke={alertActive ? alertColor : primaryColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Iris ring */}
            <circle
              cx="50"
              cy="50"
              r="8"
              fill="none"
              stroke={alertActive ? alertColor : primaryColor}
              strokeWidth="1.5"
            />
            {/* Pupil */}
            <circle
              cx="50"
              cy="50"
              r="3.5"
              fill={alertActive ? alertColor : primaryColor}
            >
              {animate && (
                <animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />
              )}
            </circle>
            {/* Highlight */}
            {!isMono && (
              <circle cx="47" cy="47" r="1.5" fill="white" fillOpacity="0.6" />
            )}
          </g>

          {/* Neural network lines — AI intelligence */}
          <g stroke={alertActive ? alertColor : primaryColor} strokeWidth="0.7" strokeOpacity="0.35" fill="none">
            <line x1="50" y1="42" x2="50" y2="24" />
            <line x1="42" y1="46" x2="28" y2="36" />
            <line x1="58" y1="46" x2="72" y2="36" />
            <line x1="42" y1="54" x2="26" y2="62" />
            <line x1="58" y1="54" x2="74" y2="62" />
            <line x1="50" y1="58" x2="50" y2="76" />
            {/* Neural nodes */}
            <circle cx="50" cy="24" r="2" fill={alertActive ? alertColor : primaryColor} fillOpacity="0.5" />
            <circle cx="28" cy="36" r="2" fill={alertActive ? alertColor : primaryColor} fillOpacity="0.5" />
            <circle cx="72" cy="36" r="2" fill={alertActive ? alertColor : primaryColor} fillOpacity="0.5" />
            <circle cx="26" cy="62" r="2" fill={alertActive ? alertColor : primaryColor} fillOpacity="0.5" />
            <circle cx="74" cy="62" r="2" fill={alertActive ? alertColor : primaryColor} fillOpacity="0.5" />
            <circle cx="50" cy="76" r="2" fill={alertActive ? alertColor : primaryColor} fillOpacity="0.5" />
          </g>

          {/* Scan line effect */}
          {animate && !isMono && (
            <line
              x1="15"
              y1="0"
              x2="85"
              y2="0"
              stroke={alertActive ? alertColor : primaryColor}
              strokeWidth="1"
              strokeOpacity="0.4"
            >
              <animate attributeName="y1" values="20;80;20" dur="4s" repeatCount="indefinite" />
              <animate attributeName="y2" values="20;80;20" dur="4s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0;0.5;0" dur="4s" repeatCount="indefinite" />
            </line>
          )}
        </svg>
      </div>

      {showText && variant !== "icon" && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-bold tracking-[0.15em] uppercase leading-none",
              s.text,
              isMono ? "" : "text-glow-cyan text-foreground"
            )}
          >
            SENTINEL
          </span>
          {size !== "sm" && (
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground leading-tight mt-0.5">
              AI Security Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
