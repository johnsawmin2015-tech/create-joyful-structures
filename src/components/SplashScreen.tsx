import { useState, useEffect } from "react";
import { SentinelLogo } from "@/components/SentinelLogo";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "expand" | "done">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("expand"), 2400);
    const t2 = setTimeout(() => setPhase("done"), 3200);
    const t3 = setTimeout(onComplete, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        phase === "done" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "hsl(222, 25%, 5%)" }}
    >
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(195, 85%, 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(195, 85%, 50%) 1px, transparent 1px)`,
        backgroundSize: "60px 60px"
      }} />

      {/* Radial glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[2000ms] ${
          phase === "logo" ? "w-[200px] h-[200px] opacity-30" : "w-[800px] h-[800px] opacity-10"
        }`}
        style={{ background: "radial-gradient(circle, hsl(195, 85%, 50% / 0.3), transparent 70%)" }}
      />

      {/* Scan lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, hsl(195, 85%, 50% / 0.15), transparent)`,
              animation: `splash-scan ${3 + i}s linear infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div
        className={`flex flex-col items-center gap-6 transition-all duration-700 ease-out ${
          phase === "logo" ? "scale-100 opacity-100" : "scale-110 opacity-0"
        }`}
      >
        <div
          className="transition-all duration-[1500ms] ease-out"
          style={{
            opacity: phase === "logo" ? 1 : 0,
            transform: phase === "logo" ? "scale(1)" : "scale(1.3)",
          }}
        >
          <SentinelLogo size="xl" animate showText={false} variant="icon" />
        </div>

        {/* Text reveal */}
        <div className="flex flex-col items-center gap-2 overflow-hidden">
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: 1,
              transform: "translateY(0)",
              transitionDelay: "600ms",
            }}
          >
            <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-foreground text-glow-cyan">
              SENTINEL
            </h1>
          </div>
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: 0.6,
              transitionDelay: "1000ms",
            }}
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground font-mono">
              AI Security Platform
            </p>
          </div>
        </div>

        {/* Loading bar */}
        <div className="w-48 h-0.5 bg-muted/20 rounded-full overflow-hidden mt-4">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: phase === "logo" ? "85%" : "100%",
              background: "linear-gradient(90deg, hsl(195, 85%, 50%), hsl(195, 90%, 60%))",
              transitionDuration: "2400ms",
            }}
          />
        </div>
        <p className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">
          INITIALIZING SECURE CONNECTION
        </p>
      </div>

      <style>{`
        @keyframes splash-scan {
          0% { top: -2%; }
          100% { top: 102%; }
        }
      `}</style>
    </div>
  );
}
