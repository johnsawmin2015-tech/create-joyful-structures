import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SentinelLogo } from "@/components/SentinelLogo";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 glass-panel relative overflow-hidden">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-sentinel-green animate-pulse" />
                <span>SYSTEM ACTIVE</span>
              </div>
            </div>
            {/* Scan line */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-scan-line" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-muted-foreground hidden sm:block tracking-wider">
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
