import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function UsersPage() {
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      return data ?? [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const getRoles = (userId: string) => roles?.filter((r) => r.user_id === userId).map((r) => r.role) ?? [];

  const roleColor: Record<string, string> = {
    admin: "bg-sentinel-red text-destructive-foreground",
    operator: "bg-primary text-primary-foreground",
    viewer: "bg-secondary text-secondary-foreground",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground text-sm">View registered users and their roles</p>
          </div>
        </div>

        <div className="gradient-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Roles</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((profile) => {
                const userRoles = getRoles(profile.user_id);
                return (
                  <tr key={profile.id} className="border-b border-border/50 hover:bg-sentinel-surface transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-sentinel-surface flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{profile.display_name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {userRoles.length > 0 ? userRoles.map((r) => (
                          <Badge key={r} className={roleColor[r] || ""}>{r}</Badge>
                        )) : (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground font-mono">
                      {format(new Date(profile.created_at), "MMM dd, yyyy")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!profiles || profiles.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">No users registered</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
