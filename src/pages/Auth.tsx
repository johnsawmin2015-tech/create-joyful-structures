import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SentinelLogo } from "@/components/SentinelLogo";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-sentinel relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
        backgroundSize: "40px 40px"
      }} />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, hsl(var(--sentinel-cyan) / 0.15), transparent 70%)" }}
      />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 animate-fade-in-up relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SentinelLogo size="lg" animate showText variant="full" />
          </div>
          <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
            Authorized Personnel Only
          </p>
        </div>

        <div className="glass-panel-strong rounded-lg p-6 glow-cyan animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-muted-foreground text-xs tracking-wider uppercase">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 bg-background/50 border-border font-mono text-sm"
                placeholder="operator@sentinel.io"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-muted-foreground text-xs tracking-wider uppercase">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 bg-background/50 border-border font-mono text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full font-semibold tracking-wider uppercase text-xs h-11" disabled={loading}>
              {loading ? "Authenticating..." : isLogin ? "Access System" : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            {isLogin ? "Need an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6 font-mono tracking-wider">
          SENTINEL v2.0 — ENCRYPTED CONNECTION
        </p>
      </div>
    </div>
  );
}
