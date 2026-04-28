import { useEffect, useState } from "react";
import { Bell, Search, ShieldCheck } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_ALERTS, type Alert } from "@/lib/sentinel-mock";

type Role = "admin" | "operator" | "viewer";

const ROLE_STYLE: Record<Role, { label: string; cls: string }> = {
  admin:    { label: "ADMIN",    cls: "border-sentinel-red/40 text-sentinel-red bg-sentinel-red/10" },
  operator: { label: "OPERATOR", cls: "border-primary/40 text-primary bg-primary/10" },
  viewer:   { label: "VIEWER",   cls: "border-border text-muted-foreground bg-muted/30" },
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [role] = useState<Role>("operator"); // RBAC: derived from user_roles table in prod
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState<Alert[]>(MOCK_ALERTS.filter((a) => !a.acknowledged));

  // Simulated real-time alert tap-in for the global notification bell
  useEffect(() => {
    const i = setInterval(() => {
      setUnread((u) => {
        if (Math.random() > 0.7 && u.length < 12) {
          const sample = MOCK_ALERTS[Math.floor(Math.random() * MOCK_ALERTS.length)];
          return [{ ...sample, alertId: `ALT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, timestamp: new Date().toISOString(), acknowledged: false }, ...u];
        }
        return u;
      });
    }, 8000);
    return () => clearInterval(i);
  }, []);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/forensic-search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 glass-panel relative overflow-hidden gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-sentinel-green animate-pulse" />
                <span>SYSTEM ACTIVE</span>
              </div>
            </div>

            {/* Global search */}
            <form onSubmit={handleSubmitSearch} className="flex-1 max-w-xl mx-auto hidden md:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cameras, alerts, events, or query forensic timeline..."
                  className="h-8 pl-8 pr-16 text-xs bg-background/60 backdrop-blur-sm border-border/60 focus-visible:ring-1"
                  aria-label="Global search"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground border border-border bg-card px-1 py-0.5 rounded pointer-events-none hidden sm:inline">
                  ⏎
                </kbd>
              </div>
            </form>

            {/* Scan line decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-scan-line" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Notification bell */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={`${unread.length} unread alerts`}
                    className="relative h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center transition-colors"
                  >
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {unread.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-sentinel-red text-destructive-foreground text-[9px] font-mono font-bold flex items-center justify-center animate-pulse-glow">
                        {unread.length > 9 ? "9+" : unread.length}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{unread.length} unread</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {unread.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">All caught up</div>
                  ) : (
                    unread.slice(0, 6).map((a) => (
                      <DropdownMenuItem
                        key={a.alertId}
                        onClick={() => navigate("/dashboard")}
                        className="flex flex-col items-start gap-0.5 py-2"
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              a.severity === "critical"
                                ? "bg-sentinel-red"
                                : a.severity === "high"
                                ? "bg-sentinel-amber"
                                : "bg-primary"
                            }`}
                          />
                          <span className="text-[10px] font-mono uppercase tracking-wider">{a.severity}</span>
                          <span className="text-[10px] font-mono text-muted-foreground ml-auto">{a.cameraId}</span>
                        </div>
                        <p className="text-xs line-clamp-1">{a.message ?? a.eventType}</p>
                      </DropdownMenuItem>
                    ))
                  )}
                  {unread.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setUnread([])}
                        className="justify-center text-xs text-muted-foreground"
                      >
                        Mark all as read
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Role badge + user menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`hidden sm:flex items-center gap-1.5 px-2 h-8 rounded-md border font-mono text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-muted/30 ${ROLE_STYLE[role].cls}`}
                    aria-label="User role"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {ROLE_STYLE[role].label}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">
                    Tier 1 SOC Analyst
                    <p className="text-[10px] font-mono text-muted-foreground font-normal mt-0.5">
                      tenant: acme-corp · {ROLE_STYLE[role].label.toLowerCase()}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="text-xs">
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/users")} className="text-xs">
                    User management
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate("/auth");
                    }}
                    className="text-xs text-destructive focus:text-destructive"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="text-[9px] font-mono text-muted-foreground hidden lg:block tracking-wider">
                SENTINEL v2.0
              </span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <div className="animate-fade-in-up">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
