import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "cyan" | "red" | "amber" | "green";
}

const variantStyles = {
  default: "border-border",
  cyan: "border-glow glow-cyan",
  red: "border-sentinel-red/30 glow-red",
  amber: "border-sentinel-amber/30",
  green: "border-sentinel-green/30",
};

const iconVariant = {
  default: "text-muted-foreground",
  cyan: "text-primary",
  red: "text-sentinel-red",
  amber: "text-sentinel-amber",
  green: "text-sentinel-green",
};

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={cn("gradient-card rounded-lg border p-5 transition-all hover:scale-[1.02]", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={cn("h-5 w-5", iconVariant[variant])} />
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold font-mono tracking-tight">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
    </div>
  );
}
